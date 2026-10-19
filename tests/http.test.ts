import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { randomBytes } from 'node:crypto'
import { access } from 'node:fs/promises'
import { createUpstream } from './helpers/upstream'

const upstream = createUpstream()
let app: ChildProcess
let origin = ''
async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  await new Promise<void>(resolve => server.close(() => resolve()))
  return port
}
async function login(email = 'admin@example.test', extra: Record<string, string> = {}) {
  return fetch(origin + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': origin, ...extra },
    body: JSON.stringify({ email, password: 'fixture-password' })
  })
}
function cookie(response: Response) {
  return response.headers.get('set-cookie')?.split(';')[0] || ''
}

beforeAll(async () => {
  await access('.output/server/index.mjs')
  const upstreamPort = await freePort()
  await new Promise<void>(resolve => upstream.server.listen(upstreamPort, '127.0.0.1', resolve))
  const port = await freePort()
  origin = `http://127.0.0.1:${port}`
  app = spawn(process.execPath, ['.output/server/index.mjs'], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      NUXT_SESSION_PASSWORD: randomBytes(32).toString('hex'),
      NUXT_SITE_URL: origin,
      NUXT_API_ENVIRONMENT: 'development',
      NUXT_API_BASE_DEV: `http://127.0.0.1:${upstreamPort}/api`,
      NUXT_API_CA_FILE: ''
    },
    stdio: 'ignore'
  })
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin + '/api/auth/session')).ok) return
    } catch {
      /* Sunucunun hazır olmasını bekle. */
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Test sunucusu başlamadı.')
})
afterAll(async () => {
  app?.kill()
  await new Promise<void>(resolve => upstream.server.close(() => resolve()))
})

describe('SSR admin HTTP güvenliği ve gerçek Laravel sözleşmesi', () => {
  it('oturumsuz dashboard isteğini reddeder', async () => {
    expect((await fetch(origin + '/api/dashboard')).status).toBe(401)
  })
  it('eksik veya yabancı origin ile girişe izin vermez', async () => {
    const bad = await login('admin@example.test', { Origin: 'https://evil.example' })
    expect(bad.status).toBe(403)
    expect((await fetch(origin + '/api/auth/login', { method: 'POST', body: '{}' })).status).toBe(
      403
    )
  })
  it('geçersiz giriş alanlarını upstream isteğinden önce reddeder', async () => {
    const result = await fetch(origin + '/api/auth/login', {
      method: 'POST',
      headers: { 'Origin': origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad', password: '' })
    })
    expect(result.status).toBe(422)
    expect((await result.json()).data.errors.email).toBeDefined()
  })
  it('admin olmayan kullanıcının tokenını iptal eder ve oturum oluşturmaz', async () => {
    const before = upstream.tokens.size
    const result = await login('user@example.test')
    expect(result.status).toBe(403)
    expect(upstream.tokens.size).toBe(before)
    expect(result.headers.get('set-cookie') || '').not.toContain('Fe26')
  })
  it('tokenı şifreli HttpOnly çerezde saklar, yanıta taşımaz', async () => {
    const result = await login()
    expect(result.status).toBe(200)
    const rawCookie = result.headers.get('set-cookie') || ''
    expect(rawCookie).toContain('HttpOnly')
    expect(rawCookie).toContain('SameSite=Lax')
    expect(rawCookie).not.toContain('fixture-token')
    expect(JSON.stringify(await result.json())).not.toContain('access_token')
  })
  it('dashboard, SSR HTML ve medya girişleri tokenı ifşa etmez', async () => {
    const authCookie = cookie(await login())
    const dashboard = await fetch(origin + '/api/dashboard', { headers: { Cookie: authCookie } })
    expect(dashboard.status).toBe(200)
    const data = await dashboard.json()
    expect(data.stats.data.total_users_count).toBe(1248)
    expect(data.reviews.data.total).toBe(1)
    const html = await (await fetch(origin + '/', { headers: { Cookie: authCookie } })).text()
    expect(html).toContain('İnceleme masası')
    expect(html).toContain('1.248')
    expect(html).not.toContain('fixture-token')
    expect(html).not.toContain('access_token')
    expect(dashboard.headers.get('cache-control')).toContain('no-store')
  })
  it('imzalanmamış sahte çerezi kabul etmez', async () => {
    expect(
      (
        await fetch(origin + '/api/dashboard', {
          headers: { Cookie: 'recipe_admin_session=admin' }
        })
      ).status
    ).toBe(401)
  })
  it('rol değişince mevcut oturumla erişimi hemen keser', async () => {
    const authCookie = cookie(await login())
    const token = [...upstream.tokens.keys()].at(-1)!
    upstream.tokens.set(token, 'user')
    expect((await fetch(origin + '/api/recipes', { headers: { Cookie: authCookie } })).status).toBe(
      403
    )
  })
  it('API arızasında sahte sıfır üretmez ve sunucu ayrıntısı sızdırmaz', async () => {
    const authCookie = cookie(await login())
    upstream.setFailure(true)
    try {
      const result = await fetch(origin + '/api/dashboard', { headers: { Cookie: authCookie } })
      const data = await result.json()
      expect(data.stats.data).toBeNull()
      expect(data.stats.error).toBeTruthy()
      expect(JSON.stringify(data)).not.toContain('PRIVATE_SQL_ERROR')
      expect(data.reviews.data.total).toBe(1)
    } finally {
      upstream.setFailure(false)
    }
  })
  it('reddetme gerekçesini ve revision çatışmasını denetler', async () => {
    const authCookie = cookie(await login())
    const send = (body: unknown, source = origin) =>
      fetch(origin + '/api/recipes/21/review', {
        method: 'PATCH',
        headers: { 'Cookie': authCookie, 'Origin': source, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    expect((await send({ status: 'approved', revision: 1 }, 'https://evil.example')).status).toBe(
      403
    )
    expect((await send({ status: 'rejected', revision: 1 })).status).toBe(422)
    expect((await send({ status: 'approved', revision: 10 })).status).toBe(409)
    expect((await send({ status: 'approved', revision: 1 })).status).toBe(200)
  })
  it('tarif kataloğu yetki denetimi, gerçek sayfalama ve hafif yanıt kullanır', async () => {
    expect((await fetch(origin + '/api/catalog')).status).toBe(401)
    const authCookie = cookie(await login())
    const result = await fetch(origin + '/api/catalog?page=2&per_page=10&sort=-id', {
      headers: { Cookie: authCookie }
    })
    expect(result.status).toBe(200)
    const data = await result.json()
    expect(data.page).toBe(2)
    expect(data.total).toBe(27)
    expect(data.items).toHaveLength(10)
    expect(data.items[0].id).toBe(116)
    expect(JSON.stringify(data)).not.toContain('PRIVATE_PROVIDER')
    expect(JSON.stringify(data)).not.toContain('NEVER_SEND_RECIPE_BODY')
    expect(upstream.catalogRequests.at(-1)?.summary).toBe('1')
  })
  it('arama, dil ve sıralama parametrelerini yalnız izinli API alanlarına taşır', async () => {
    const authCookie = cookie(await login())
    const result = await fetch(
      origin + '/api/catalog?q=Mercimek&locale=tr&sort=cooking_time&per_page=25',
      { headers: { Cookie: authCookie } }
    )
    expect(result.status).toBe(200)
    const data = await result.json()
    expect(data.items.length).toBeGreaterThan(0)
    expect(
      data.items.every(
        (item: { locale: string, title: string }) =>
          item.locale === 'tr' && item.title.includes('Mercimek')
      )
    ).toBe(true)
    expect(upstream.catalogRequests.at(-1)).toMatchObject({
      'filter[title]': 'Mercimek',
      'filter[locale]': 'tr',
      'sort': 'cooking_time',
      'per_page': '25'
    })
    const before = upstream.catalogRequests.length
    expect(
      (
        await fetch(origin + '/api/catalog?per_page=100000&sort=password', {
          headers: { Cookie: authCookie }
        })
      ).status
    ).toBe(422)
    expect(upstream.catalogRequests).toHaveLength(before)
  })
  it('tarif ekranı SSR ile doğru listeyi ve ayrı inceleme bağlantısını gösterir', async () => {
    const authCookie = cookie(await login())
    const response = await fetch(origin + '/recipes?q=Mercimek&locale=tr', {
      headers: { Cookie: authCookie }
    })
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('Tarif kütüphanesi')
    expect(html).toContain('Mercimek çorbası')
    expect(html).not.toContain('Fırında sebzeli makarna 26')
    expect(html).toContain('/reviews')
    expect(html).not.toContain('fixture-token')
    const languages = await (
      await fetch(origin + '/api/catalog/languages', { headers: { Cookie: authCookie } })
    ).json()
    expect(languages[0]).toEqual({ code: 'tr', name: 'Türkçe' })
  })
  it('katalog arızası ile boş arama sonucunu ayırt eder', async () => {
    const authCookie = cookie(await login())
    const empty = await (
      await fetch(origin + '/api/catalog?q=unmatched', { headers: { Cookie: authCookie } })
    ).json()
    expect(empty.total).toBe(0)
    upstream.setCatalogFailure(true)
    try {
      const result = await fetch(origin + '/api/catalog', { headers: { Cookie: authCookie } })
      expect(result.status).toBe(500)
      expect(await result.text()).not.toContain('PRIVATE_CATALOG_FAILURE')
    } finally {
      upstream.setCatalogFailure(false)
    }
  })
  it('tarif detayını korunan salt okunur uçtan getirir ve hatalı kimliği reddeder', async () => {
    expect((await fetch(origin + '/api/catalog/126')).status).toBe(401)
    const authCookie = cookie(await login())
    const response = await fetch(origin + '/api/catalog/126?locale=tr', {
      headers: { Cookie: authCookie }
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.id).toBe(126)
    expect(data.ingredients[0]).toBe('2 su bardağı Mercimek')
    expect(data.sections[0].items).toHaveLength(3)
    expect(data.tips).toEqual(['Kıvamını sıcak suyla ayarlayın.'])
    expect(JSON.stringify(data)).not.toContain('PRIVATE_PROVIDER')
    expect(
      (await fetch(origin + '/api/catalog/99999', { headers: { Cookie: authCookie } })).status
    ).toBe(404)
    expect(
      (
        await fetch(origin + '/api/catalog/126?locale=bad/locale', {
          headers: { Cookie: authCookie }
        })
      ).status
    ).toBe(422)
  })
  it('inceleme detayı ve galeri medyası oturum gerektirir', async () => {
    expect((await fetch(origin + '/api/recipes/21')).status).toBe(401)
    const imagePath = '/api/media/recipes/21/22222222-2222-4222-8222-222222222222'
    expect((await fetch(origin + imagePath)).status).toBe(401)
    const authCookie = cookie(await login())
    const headers = { Cookie: authCookie }
    const detail = await (await fetch(origin + '/api/recipes/21', { headers })).json()
    expect(detail.gallery).toHaveLength(2)
    const image = await fetch(origin + imagePath, { headers })
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/png')
    expect(image.headers.get('cache-control')).toContain('no-store')
    expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(100)
    expect((await fetch(origin + '/api/recipes/not-id', { headers })).status).toBe(404)
  })
  it('onaydan yeniden incelemeye ve ret/onay sürecine güncel sürümle geçer', async () => {
    upstream.resetReview()
    const authCookie = cookie(await login())
    const headers = { 'Cookie': authCookie, 'Origin': origin, 'Content-Type': 'application/json' }
    const review = (status: string, revision: number, review_note?: string) =>
      fetch(origin + '/api/recipes/21/review', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, revision, review_note })
      })
    for (const [index, status] of ['approved', 'pending', 'rejected', 'approved'].entries()) {
      const result = await review(status, index + 1, 'İnceleme gerekçesi')
      expect(result.status).toBe(200)
      const data = (await result.json()).data
      expect(data.status).toBe(status)
      expect(data.revision).toBe(index + 2)
    }
    expect((await review('pending', 1)).status).toBe(409)
  })
  it('admin tarifi düzenlerken galeriyi korur, metinleri doğrular ve eski sürümü reddeder', async () => {
    upstream.resetReview()
    expect(
      (
        await fetch(origin + '/api/recipes/21', {
          method: 'PATCH',
          headers: { Origin: origin },
          body: '{}'
        })
      ).status
    ).toBe(401)
    const authCookie = cookie(await login())
    const headers = { 'Cookie': authCookie, 'Origin': origin, 'Content-Type': 'application/json' }
    const payload = {
      revision: 1,
      title: 'Düzenlenen makarna',
      ingredients: ['2 domates', '1 paket makarna'],
      preparation: 'Malzemeleri doğrayıp fırında pişirin.',
      person_count: 4,
      cooking_time: 25,
      tips: null
    }
    const send = (data: unknown, source = origin) =>
      fetch(origin + '/api/recipes/21', {
        method: 'PATCH',
        headers: { ...headers, Origin: source },
        body: JSON.stringify(data)
      })
    expect((await send(payload, 'https://evil.example')).status).toBe(403)
    expect((await send({ ...payload, status: 'approved' })).status).toBe(422)
    expect((await send({ ...payload, ingredients: [''] })).status).toBe(422)
    const result = await send(payload)
    expect(result.status).toBe(200)
    const data = (await result.json()).data
    expect(data.title).toBe('Düzenlenen makarna')
    expect(data.status).toBe('pending')
    expect(data.revision).toBe(2)
    expect(data.gallery).toHaveLength(2)
    expect(data.cover_image.id).toBe('11111111-1111-4111-8111-111111111111')
    expect((await send(payload)).status).toBe(409)
    upstream.resetReview()
  })
  it('inceleme sayfası yayındaki ve reddedilen tariflere varsayılan listeden tekrar eriştirir', async () => {
    upstream.resetReview()
    const authCookie = cookie(await login())
    const headers = { 'Cookie': authCookie, 'Origin': origin, 'Content-Type': 'application/json' }
    let revision = 1
    for (const status of ['approved', 'rejected']) {
      const result = await fetch(origin + '/api/recipes/21/review', {
        method: 'PATCH', headers,
        body: JSON.stringify({ status, revision, review_note: 'Tekrar değerlendirme.' })
      })
      expect(result.status).toBe(200)
      revision = (await result.json()).data.revision
      const html = await (await fetch(origin + '/reviews', { headers: { Cookie: authCookie } })).text()
      expect(html).toContain('Fırında sebzeli makarna')
      expect(html).toContain('Tüm tarifler')
      expect(html).toContain('Reddedilenler')
      const filtered = await (await fetch(origin + '/api/recipes?status=' + status, { headers: { Cookie: authCookie } })).json()
      expect(filtered.items[0].status).toBe(status)
      const reopen = await fetch(origin + '/api/recipes/21/review', {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'pending', revision })
      })
      expect(reopen.status).toBe(200)
      const reopened = (await reopen.json()).data
      expect(reopened.status).toBe('pending')
      revision = reopened.revision
    }
    upstream.resetReview()
  })
  it('çıkışta tokenı ve oturumu iptal eder', async () => {
    const authCookie = cookie(await login())
    const result = await fetch(origin + '/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: authCookie, Origin: origin }
    })
    expect(result.status).toBe(200)
    expect(
      (await fetch(origin + '/api/dashboard', { headers: { Cookie: authCookie } })).status
    ).toBe(401)
  })
})

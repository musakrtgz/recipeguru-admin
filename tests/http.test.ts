import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { randomBytes } from 'node:crypto'
import { access } from 'node:fs/promises'
import { createUpstream } from './helpers/upstream'
import { reviewPhotos } from './helpers/reviewPhotos'

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
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, revision, review_note: 'Tekrar değerlendirme.' })
      })
      expect(result.status).toBe(200)
      revision = (await result.json()).data.revision
      const html = await (
        await fetch(origin + '/reviews', { headers: { Cookie: authCookie } })
      ).text()
      expect(html).toContain('Fırında sebzeli makarna')
      expect(html).toContain('Tüm tarifler')
      expect(html).toContain('Reddedilenler')
      const filtered = await (
        await fetch(origin + '/api/recipes?status=' + status, { headers: { Cookie: authCookie } })
      ).json()
      expect(filtered.items[0].status).toBe(status)
      const reopen = await fetch(origin + '/api/recipes/21/review', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'pending', revision })
      })
      expect(reopen.status).toBe(200)
      const reopened = (await reopen.json()).data
      expect(reopened.status).toBe('pending')
      revision = reopened.revision
    }
    upstream.resetReview()
  })
  it('reklam listesi, ayarları, rapor ve medya admin oturumu gerektirir', async () => {
    for (const path of [
      '/advertisements',
      '/advertisements/settings',
      '/advertisements/31/report?from=2026-10-01&to=2026-10-03',
      '/media/advertisements/31/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    ]) {
      expect((await fetch(origin + '/api' + path)).status).toBe(401)
    }
    const authCookie = cookie(await login())
    const headers = { Cookie: authCookie }
    const response = await fetch(origin + '/api/advertisements?status=enabled&q=Hafta', { headers })
    const data = await response.json()
    expect(data.total).toBe(1)
    expect(data.items[0].title).toBe('Haftanın lezzeti')
    expect(JSON.stringify(data)).not.toContain('PRIVATE_STORE_PATH')
    expect(
      (await fetch(origin + '/api/advertisements?destination_type=password', { headers })).status
    ).toBe(422)
    const html = await (await fetch(origin + '/advertisements', { headers })).text()
    expect(html).toContain('Reklam kampanyaları')
    expect(html).toContain('Haftanın lezzeti')
    expect(html).not.toContain('aria-invalid="true"')
    expect(html).toContain('Arşiv')
    expect(html).not.toContain('fixture-token')
    const image = await fetch(
      origin + '/api/media/advertisements/31/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      { headers }
    )
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/png')
    expect(image.headers.get('cache-control')).toContain('no-store')
  })
  it('genel reklam sıklığı yalnız aynı origin ve geçerli aralıkla güncellenir', async () => {
    const authCookie = cookie(await login())
    const send = (data: unknown, source = origin) =>
      fetch(origin + '/api/advertisements/settings', {
        method: 'PUT',
        headers: { 'Cookie': authCookie, 'Origin': source, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    expect((await send({ enabled: false, organic_interval: 5 }, 'https://evil.test')).status).toBe(
      403
    )
    expect((await send({ enabled: false, organic_interval: 0 })).status).toBe(422)
    const result = await send({ enabled: false, organic_interval: 5 })
    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ enabled: false, organic_interval: 5 })
    upstream.ads.reset()
  })
  it('reklamı multipart ile oluşturur, günceller, durdurur ve geçmişi koruyarak arşivler', async () => {
    upstream.ads.reset()
    const authCookie = cookie(await login())
    const headers = { Cookie: authCookie, Origin: origin }
    const form = (overrides: Record<string, string> = {}, image = true) => {
      const data = new FormData()
      const fields = {
        title: 'Test kampanyası',
        sponsor_name: 'Test marka',
        body: '',
        cta_label: '',
        destination_type: 'external',
        destination_id: '',
        external_url: 'https://example.test/kampanya',
        locale: '',
        is_active: '0',
        starts_at: '2026-10-19T10:00:00Z',
        ends_at: '2099-10-31T18:00:00Z',
        weight: '2',
        daily_user_cap: '3',
        max_impressions: '',
        ...overrides
      }
      for (const [key, value] of Object.entries(fields)) data.set(key, value)
      if (image)
        data.set(
          'image',
          new Blob([new Uint8Array(Buffer.from(reviewPhotos[0]!, 'base64'))], {
            type: 'image/png'
          }),
          'private-filename.png'
        )
      return data
    }
    expect(
      (
        await fetch(origin + '/api/advertisements', {
          method: 'POST',
          headers: { ...headers, Origin: 'https://evil.test' },
          body: form()
        })
      ).status
    ).toBe(403)
    expect(
      (
        await fetch(origin + '/api/advertisements', {
          method: 'POST',
          headers,
          body: form({}, false)
        })
      ).status
    ).toBe(422)
    expect(
      (
        await fetch(origin + '/api/advertisements', {
          method: 'POST',
          headers,
          body: form({ clicks_count: '999' })
        })
      ).status
    ).toBe(422)
    const result = await fetch(origin + '/api/advertisements', {
      method: 'POST',
      headers,
      body: form()
    })
    expect(result.status).toBe(201)
    const created = await result.json()
    expect(created.id).toBe(34)
    expect(created.is_active).toBe(false)
    expect(upstream.ads.requests.at(-1)?.fields?.imageName).toBe('advertisement.png')
    const edit = await fetch(origin + '/api/advertisements/34', {
      method: 'POST',
      headers,
      body: form({ title: 'Güncel kampanya', expected_revision: '1' }, false)
    })
    expect(edit.status).toBe(200)
    const updated = await edit.json()
    expect(updated.title).toBe('Güncel kampanya')
    expect(updated.image.id).toBe(created.image.id)
    expect(updated.revision).toBe(2)
    expect(upstream.ads.requests.at(-1)?.fields?._method).toBe('PUT')
    expect(
      (
        await fetch(origin + '/api/advertisements/34', {
          method: 'POST',
          headers,
          body: form({ expected_revision: '1' }, false)
        })
      ).status
    ).toBe(409)
    expect(
      (
        await fetch(origin + '/api/advertisements/34', {
          method: 'POST',
          headers,
          body: form({}, false)
        })
      ).status
    ).toBe(422)
    const toggle = (expected_revision: number) =>
      fetch(origin + '/api/advertisements/34', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true, expected_revision })
      })
    expect((await toggle(2)).status).toBe(200)
    expect((await toggle(2)).status).toBe(409)
    expect(
      (await fetch(origin + '/api/advertisements/34', { method: 'DELETE', headers })).status
    ).toBe(204)
    const archived = await (await fetch(origin + '/api/advertisements/34', { headers })).json()
    expect(archived.deleted_at).toBeTruthy()
    expect(archived.impressions_count).toBe(0)
    const report = await fetch(
      origin + '/api/advertisements/34/report?from=2026-10-01&to=2026-10-03',
      { headers }
    )
    expect(report.status).toBe(200)
    expect((await report.json()).daily).toHaveLength(3)
    upstream.ads.reset()
  })
  it('reklam raporları tarih sınırını uygular ve önizleme olay sayacı üretmez', async () => {
    const authCookie = cookie(await login())
    const headers = { Cookie: authCookie }
    expect(
      (
        await fetch(origin + '/api/advertisements/31/report?from=2026-01-01&to=2027-01-02', {
          headers
        })
      ).status
    ).toBe(422)
    const result = await fetch(
      origin + '/api/advertisements/31/report?from=2026-10-01&to=2026-10-07',
      { headers }
    )
    const data = await result.json()
    expect(data.timezone).toBe('UTC')
    expect(data.daily).toHaveLength(7)
    expect(data.impressions).toBe(
      data.daily.reduce((total: number, day: { impressions: number }) => total + day.impressions, 0)
    )
    expect(upstream.ads.requests.some(request => /impressions|clicks/.test(request.path))).toBe(
      false
    )
    upstream.ads.fail(true)
    try {
      const failure = await fetch(origin + '/api/advertisements', { headers })
      expect(failure.status).toBe(500)
      expect(await failure.text()).not.toContain('PRIVATE_AD_DATABASE_FAILURE')
    } finally {
      upstream.ads.fail(false)
    }
  })
  it('reklam hedefleri yalnız hazır tarif veya onaylı kullanıcı tarifi arasından aranır', async () => {
    upstream.resetReview()
    const authCookie = cookie(await login())
    const headers = { Cookie: authCookie }
    const recipes = await (
      await fetch(origin + '/api/advertisements/targets?type=recipe&q=Mercimek', { headers })
    ).json()
    expect(recipes.items.length).toBeGreaterThan(0)
    expect(recipes.items[0].title).toContain('Mercimek')
    expect(JSON.stringify(recipes)).not.toContain('PRIVATE_PROVIDER')
    expect(
      (await fetch(origin + '/api/advertisements/targets?type=users', { headers })).status
    ).toBe(422)
    const approve = await fetch(origin + '/api/recipes/21/review', {
      method: 'PATCH',
      headers: { ...headers, 'Origin': origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', revision: 1 })
    })
    expect(approve.status).toBe(200)
    const community = await (
      await fetch(origin + '/api/advertisements/targets?type=submitted_recipe&q=makarna', {
        headers
      })
    ).json()
    expect(community.items[0].id).toBe(21)
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

describe('AI publishing BFF security and workflows', () => {
  it('prepares an AI recipe manually with a fixed target, strict inputs and an idempotency key while automation is off', async () => {
    upstream.ai.reset()
    const endpoint = origin + '/api/ai-publications/prepare'
    const body = JSON.stringify({ profile_id: 7, request_id: '8d22a0c6-b614-4cf1-a833-d6af156053aa', brief: 'Sebzeli makarna' })
    expect((await fetch(endpoint, { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json' }, body })).status).toBe(401)
    const headers = { 'Cookie': cookie(await login()), 'Origin': origin, 'Content-Type': 'application/json' }
    expect((await fetch(endpoint, { method: 'POST', headers: { ...headers, Origin: 'https://evil.test' }, body })).status).toBe(403)
    const before = upstream.ai.requests.length
    for (const extra of [{ status: 'published' }, { user_id: 99 }, { manual_preparation: false }, { request_id: 'invalid' }]) {
      expect((await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ ...JSON.parse(body), ...extra }) })).status).toBe(422)
    }
    expect(upstream.ai.requests).toHaveLength(before)
    const first = await fetch(endpoint, { method: 'POST', headers, body })
    expect(first.status).toBe(200)
    const row = await first.json()
    expect(row).toMatchObject({ id: 82, manual_preparation: true, preparation_brief: 'Sebzeli makarna', status: 'planned' })
    expect(row.cover_image).toBeNull()
    expect(JSON.stringify(row)).not.toContain('PRIVATE_AI')
    expect(upstream.ai.requests.at(-1)).toMatchObject({ path: '/api/admin/ai-publications/prepare', method: 'POST', payload: JSON.parse(body) })
    const repeated = await fetch(endpoint, { method: 'POST', headers, body })
    expect((await repeated.json()).id).toBe(row.id)
    const changed = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ ...JSON.parse(body), profile_id: 1 }) })
    expect(changed.status).toBe(409)
    const settings = await (await fetch(origin + '/api/ai-publications/settings', { headers })).json()
    expect(settings.enabled).toBe(false)
  })

  it('publishes a ready draft immediately through the authenticated action while automation is paused', async () => {
    upstream.ai.reset()
    const token = cookie(await login())
    const headers = { 'Cookie': token, 'Origin': origin, 'Content-Type': 'application/json' }
    const url = origin + '/api/ai-publications/81/publish-now'
    const payload = JSON.stringify({ revision: 4, note: 'Şimdi paylaş' })
    expect((await fetch(url, { method: 'POST', headers: { ...headers, Origin: 'https://evil.test' }, body: payload })).status).toBe(403)
    expect((await fetch(url, { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json' }, body: payload })).status).toBe(401)
    const result = await fetch(url, { method: 'POST', headers, body: payload })
    expect(result.status).toBe(200)
    const row = await result.json()
    expect(row.status).toBe('published')
    expect(row.submitted_recipe_id).toBe(201)
    expect(row.published_at).toBeTruthy()
    expect(row.scheduled_at).toContain('2099-10-21')
    expect(JSON.stringify(row)).not.toContain('PRIVATE_AI')
    expect(upstream.ai.requests.at(-1)?.payload).toEqual({ revision: 4, note: 'Şimdi paylaş' })
    expect((await fetch(url, { method: 'POST', headers, body: payload })).status).toBe(409)
  })

  it('exposes a failed review in the list and detail so it cannot be mistaken for a missing cover', async () => {
    upstream.ai.reset()
    upstream.ai.requireCorrection()
    const headers = { Cookie: cookie(await login()) }
    const list = await (await fetch(origin + '/api/ai-publications', { headers })).json()
    expect(list.items[0].review_passed).toBe(false)
    const detail = await (await fetch(origin + '/api/ai-publications/81', { headers })).json()
    expect(detail.review_passed).toBe(false)
    expect(detail.preparation_brief).toBe('spoonful')
    expect(detail.ai_review.approved).toBe(false)
    expect(detail.cover_image).toBeNull()
    upstream.ai.reset()
  })
  it('protects settings, profiles, lists and cover reads', async () => {
    for (const path of ['/ai-publications', '/ai-publications/settings', '/ai-publications/profiles', '/ai-publications/81/cover']) expect((await fetch(origin + '/api' + path)).status).toBe(401)
  })
  it('SSR renders AI publishing without leaking private credentials or image paths', async () => {
    upstream.ai.reset()
    const headers = { Cookie: cookie(await login()) }
    const response = await fetch(origin + '/ai-publications', { headers })
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('AI Yayınları')
    expect(html).toContain('İki Kişilik Sofra')
    expect(html).not.toContain('PRIVATE_AI_SECRET')
    expect(html).not.toContain('PRIVATE_AI_IMAGE_PATH')
    expect(html).not.toContain('fixture-token-for-tests-only')
    expect(html).not.toContain('aria-invalid="true"')
    expect(upstream.ai.requests.every(item => item.method === 'GET')).toBe(true)
  })
  it('checks CSRF, schema injection, optimistic revision and authenticated media', async () => {
    upstream.ai.reset()
    const token = cookie(await login())
    const headers = { 'Cookie': token, 'Origin': origin, 'Content-Type': 'application/json' }
    const base = origin + '/api/ai-publications'
    expect((await fetch(base + '/81/approve', { method: 'POST', headers: { ...headers, Origin: 'https://evil.test' }, body: JSON.stringify({ revision: 4 }) })).status).toBe(403)
    expect((await fetch(base + '/81/approve', { method: 'POST', headers, body: JSON.stringify({ revision: 4, status: 'published' }) })).status).toBe(422)
    expect((await fetch(base + '/81/delete', { method: 'POST', headers, body: JSON.stringify({ revision: 4 }) })).status).toBe(404)
    const detail = await (await fetch(base + '/81', { headers })).json()
    expect(detail.cover_image.url).toBe('/api/ai-publications/81/cover?v=4')
    expect(detail.cover_image).toMatchObject({ width: 1080, height: 566 })
    expect(JSON.stringify(detail)).not.toContain('PRIVATE_AI')
    const image = await fetch(base + '/81/cover', { headers })
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toContain('image/png')
    expect(image.headers.get('cache-control')).toContain('no-store')
    const approved = await fetch(base + '/81/approve', { method: 'POST', headers, body: JSON.stringify({ revision: 4 }) })
    expect(approved.status).toBe(200)
    expect((await approved.json()).status).toBe('ready')
    expect((await fetch(base + '/81/reject', { method: 'POST', headers, body: JSON.stringify({ revision: 4, note: 'Eski pencere' }) })).status).toBe(409)
  })
  it('forwards only validated settings, profile and structured recipe fields', async () => {
    upstream.ai.reset()
    const headers = { 'Cookie': cookie(await login()), 'Origin': origin, 'Content-Type': 'application/json' }
    const base = origin + '/api/ai-publications'
    const settings = await (await fetch(base + '/settings', { headers })).json()
    const value = { revision: settings.revision, enabled: true, require_admin_review: true, timezone: 'Europe/Istanbul', daily_budget_usd: 5, request_reservation_usd: 0.5, daily_publication_limit: 7 }
    expect((await fetch(base + '/settings', { method: 'PUT', headers, body: JSON.stringify(value) })).status).toBe(200)
    expect((await fetch(base + '/settings', { method: 'PUT', headers, body: JSON.stringify(value) })).status).toBe(409)
    const profiles = await (await fetch(base + '/profiles', { headers })).json()
    const profile = profiles[0]
    const profileValue = { revision: profile.revision, enabled: profile.enabled, locale: profile.locale, times: ['08:30'], instruction: profile.instruction, image_style: profile.image_style }
    expect((await fetch(base + '/profiles/' + profile.id, { method: 'PUT', headers, body: JSON.stringify(profileValue) })).status).toBe(200)
    const updated = await fetch(base + '/81', { method: 'PATCH', headers, body: JSON.stringify({ revision: 4, draft: { title: 'Yeni tarif', ingredients: ['2 adet domates'], preparation: 'Domatesleri doğrayıp pişirin.', person_count: 2, cooking_time: 15, tips: null } }) })
    expect(updated.status).toBe(200)
    const row = await updated.json()
    expect(row.status).toBe('planned')
    expect(row.cover_image).toBeNull()
    const outgoing = upstream.ai.requests.find(item => item.method === 'PATCH')
    expect(outgoing?.payload).not.toHaveProperty('user_id')
    expect(outgoing?.payload).not.toHaveProperty('status')
  })
})

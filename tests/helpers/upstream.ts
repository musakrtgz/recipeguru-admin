import { createServer } from 'node:http'
import type { IncomingMessage } from 'node:http'
import type { SubmittedRecipe } from '../../shared/types/api'
import { reviewPhotos } from './reviewPhotos.ts'
import { createAdvertisementUpstream } from './advertisements.ts'

export function createUpstream() {
  const ads = createAdvertisementUpstream()
  const tokens = new Map<string, string>()
  let next = 1
  let failStats = false
  const catalogRequests: Record<string, string>[] = []
  let failCatalog = false
  const catalog = Array.from({ length: 27 }, (_, i) => ({
    id: 100 + i,
    min_person: 2,
    max_person: 4,
    cooking_time: 10 + i,
    calories: 250 + i,
    created_at: '2026-10-19T10:00:00Z',
    translation: {
      title: i % 2 === 0 ? 'Mercimek çorbası ' + (i + 1) : 'Fırında sebzeli makarna ' + (i + 1),
      locale: i % 3 === 0 ? 'en' : 'tr',
      recipe: 'NEVER_SEND_RECIPE_BODY'
    },
    cookerable: { translation: { name: 'Ocak' } },
    repastable: { translation: { name: 'Akşam yemeği' } },
    provider: 'PRIVATE_PROVIDER'
  }))
  const initialReview: SubmittedRecipe = {
    id: 21,
    title: 'Fırında sebzeli makarna',
    content: null,
    ingredients: ['2 domates', '1 paket makarna'],
    preparation: 'Sebzeleri doğrayıp fırında pişirin.',
    tips: 'Sıcak servis edin.',
    locale: 'tr',
    person_count: 4,
    cooking_time: 25,
    revision: 1,
    status: 'pending',
    review_note: null,
    reviewed_at: null,
    reviewed_by: null,
    review_source: null,
    cover_image: {
      id: '11111111-1111-4111-8111-111111111111',
      url: 'https://api.example.test/private/cover'
    },
    gallery: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        url: 'https://api.example.test/private/gallery-1'
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        url: 'https://api.example.test/private/gallery-2'
      }
    ],
    author: { id: 8, name: 'Test', surname: 'Şef', username: 'testchef' },
    submitted_at: '2026-10-19T10:00:00Z'
  }
  let review = structuredClone(initialReview)
  const profile = (role: string) => ({
    id: 7,
    name: 'Test',
    surname: 'Yönetici',
    email: 'admin@example.test',
    role,
    is_active: true,
    is_blocked: false
  })
  async function body(req: IncomingMessage) {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
    return JSON.parse(Buffer.concat(chunks).toString() || '{}')
  }
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost')
    const send = (status: number, payload: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(payload))
    }
    if (url.pathname === '/api/auth/login') {
      const payload = await body(req)
      if (payload.password !== 'fixture-password')
        return send(401, { message: 'Giriş bilgileri hatalı.' })
      const role = payload.email === 'admin@example.test' ? 'admin' : 'user'
      const token = `${next++}|fixture-token-for-tests-only`
      tokens.set(token, role)
      return send(200, {
        status: true,
        data: { ...profile(role), access_token: { token, name: 'login_token' } }
      })
    }
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const role = tokens.get(token)
    if (!role) return send(401, { message: 'Unauthenticated.' })
    if (url.pathname === '/api/auth/logout') {
      tokens.delete(token)
      res.writeHead(204)
      return res.end()
    }
    if (url.pathname === '/api/me') return send(200, { data: profile(role) })
    if (role !== 'admin') return send(403, { message: 'Admin gerekir.' })
    if (await ads.handle(req, res, url)) return
    const image = url.pathname.match(/^\/api\/submitted-recipes\/21\/images\/([a-f0-9-]+)$/)
    if (image) {
      const index = [review.cover_image?.id, ...review.gallery.map(item => item.id)].indexOf(
        image[1]
      )
      if (index < 0) return send(404, { message: 'Görsel bulunamadı.' })
      res.writeHead(200, { 'Content-Type': 'image/png' })
      return res.end(Buffer.from(reviewPhotos[index]!, 'base64'))
    }
    if (url.pathname === '/api/admin/submitted-recipes/21') {
      if (req.method === 'GET') return send(200, { data: review })
      if (req.method === 'PATCH') {
        const payload = await body(req)
        if (payload.revision !== review.revision)
          return send(409, { message: 'Tarif değişti. Günceli yükleyin.' })
        Object.assign(review, payload, {
          revision: review.revision + 1,
          status: 'pending',
          review_note: null,
          reviewed_at: null,
          reviewed_by: null,
          review_source: null
        })
        return send(200, { data: review })
      }
    }
    if (url.pathname === '/api/languages')
      return send(200, {
        data: [
          { code: 'tr', name: 'Turkish', local_name: 'Türkçe' },
          { code: 'en', name: 'English', local_name: 'English' }
        ]
      })
    const preview = url.pathname.match(/^\/api\/admin\/recipes\/(\d+)\/preview$/)
    if (preview) {
      const item = catalog.find(row => row.id === Number(preview[1]))
      if (!item) return send(404, { message: 'Tarif bulunamadı.' })
      return send(200, {
        data: {
          id: item.id,
          title: item.translation.title,
          locale: item.translation.locale,
          min_person: item.min_person,
          max_person: item.max_person,
          cooking_time: item.cooking_time,
          calories: item.calories,
          image_url: null,
          cooker: 'Ocak',
          repast: 'Akşam yemeği',
          created_at: item.created_at,
          ingredients: [
            { name: 'Mercimek', amount: '2', measurement: 'su bardağı' },
            { name: 'Su', amount: '4', measurement: 'su bardağı' }
          ],
          recipe: [
            'Mercimeği yıkayın.',
            'Malzemeleri tencereye ekleyip pişirin.',
            'Sıcak servis edin.'
          ],
          tips: ['Kıvamını sıcak suyla ayarlayın.'],
          provider: 'PRIVATE_PROVIDER'
        }
      })
    }
    if (url.pathname === '/api/admin/recipes') {
      catalogRequests.push(Object.fromEntries(url.searchParams))
      if (failCatalog) return send(500, { message: 'PRIVATE_CATALOG_FAILURE' })
      const title = url.searchParams.get('filter[title]')?.toLocaleLowerCase('tr') || ''
      const locale = url.searchParams.get('filter[locale]')
      const sort = url.searchParams.get('sort') || '-id'
      const page = Number(url.searchParams.get('page') || 1)
      const size = Number(url.searchParams.get('per_page') || 10)
      const rows = catalog
        .filter(
          row =>
            (!locale || row.translation.locale === locale)
            && row.translation.title.toLocaleLowerCase('tr').includes(title)
        )
        .sort(
          (a, b) =>
            (sort.startsWith('-') ? -1 : 1)
            * (sort.includes('cooking_time') ? a.cooking_time - b.cooking_time : a.id - b.id)
        )
      return send(200, {
        data: rows.slice((page - 1) * size, page * size),
        meta: {
          current_page: page,
          last_page: Math.max(1, Math.ceil(rows.length / size)),
          per_page: size,
          total: rows.length
        }
      })
    }
    if (url.pathname === '/api/admin/stats/dashboard') {
      if (failStats) return send(500, { message: 'PRIVATE_SQL_ERROR secret-column' })
      return send(200, {
        status: true,
        data: {
          total_users_count: 1248,
          total_deleted_users_count: 4,
          total_has_recipe_users_count: 825,
          total_not_has_collections_count: 24,
          total_recipes_count: 5632,
          total_collections_count: 340,
          total_payment_amount_try: 18500,
          total_payment_amount_usd: 280,
          payment_trial_count: 8,
          payment_normal_start_count: 3
        }
      })
    }
    if (url.pathname === '/api/admin/submitted-recipes') {
      const status = url.searchParams.get('filter[status]')
      const items = !status || status === review.status ? [review] : []
      return send(200, {
        status: true,
        data: items,
        meta: { current_page: 1, last_page: 1, per_page: 10, total: items.length }
      })
    }
    if (url.pathname === '/api/admin/submitted-recipes/21/review') {
      const payload = await body(req)
      if (payload.revision !== review.revision)
        return send(409, { message: 'Tarif değişti. Listeyi yenileyin.' })
      review.status = payload.status
      review.review_note = payload.review_note || null
      review.reviewed_by = 7
      review.review_source = 'admin'
      review.reviewed_at = payload.status === 'pending' ? null : '2026-10-19T12:00:00Z'
      review.revision++
      return send(200, { status: true, data: review, message: 'İnceleme tamamlandı.' })
    }
    return send(404, { message: 'Bulunamadı.' })
  })
  return {
    server,
    ads,
    tokens,
    profile,
    catalogRequests,
    resetReview: () => {
      review = structuredClone(initialReview)
    },
    setCatalogFailure: (value: boolean) => {
      failCatalog = value
    },
    setFailure: (value: boolean) => {
      failStats = value
    }
  }
}

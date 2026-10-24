import type { IncomingMessage, ServerResponse } from 'node:http'
import { reviewPhotos } from './reviewPhotos.ts'

export function createAiPublicationUpstream() {
  const names = [
    ['Tatlı Molası', 'tatlimolasi', 'dessert', '15:00'],
    ['Hafif Tabak', 'hafiftabak', 'balanced', '11:30'],
    ['Günaydın Sofrası', 'gunaydinsofrasi', 'breakfast', '07:30'],
    ['Fırından Sıcak', 'firindansicak', 'bakery', '10:00'],
    ['Yeşil Kase', 'yesilkase', 'salad', '13:00'],
    ['Tencere Günlüğü', 'tenceregunlugu', 'home_cooking', '18:00'],
    ['İki Kişilik Sofra', 'ikikisiliksofra', 'romantic', '19:30']
  ]
  const profiles = names.map((item, index) => ({
    id: index + 1,
    user_id: index + 8,
    name: item[0]!,
    username: item[1]!,
    type: item[2]!,
    type_label: [
      'Tatlı ve pasta',
      'Hafif ve dengeli',
      'Kahvaltı',
      'Hamur işleri',
      'Salata',
      'Ev yemekleri',
      'Romantik yemekler'
    ][index]!,
    available: true,
    revision: 1,
    enabled: true,
    locale: 'tr',
    times: [item[3]!],
    instruction: 'Ulaşılabilir malzemelerle özgün tarifler hazırla.',
    image_style: 'Doğal ışık ve sade bir sofra.'
  }))
  const initialSettings = {
    revision: 1,
    enabled: false,
    require_admin_review: true,
    timezone: 'Europe/Istanbul',
    daily_budget_usd: 5,
    request_reservation_usd: 0.5,
    daily_publication_limit: 7,
    provider_configured: true,
    text_model: 'gpt-6-luna',
    image_model: 'gpt-image-2.5-flare-2026-09-08',
    last_tick_at: '2026-10-21T09:00:00Z',
    last_worker_at: '2026-10-21T09:05:00Z',
    today: {
      date: '2026-10-21',
      requests: 3,
      estimated_usd: 0.08,
      charged_usd: 0.08,
      unknown_requests: 0
    }
  }
  const draft = {
    title: 'İki kişilik sebzeli makarna',
    ingredients: ['200 g makarna', '2 adet domates'],
    preparation: 'Makarnayı haşlayın. Sosu hazırlayıp karıştırın ve sıcak servis edin.',
    person_count: 2,
    cooking_time: 25,
    tips: 'Sosu sıcak ekleyin.'
  }
  const initial = {
    id: 81,
    user_id: 14,
    profile_id: 7,
    author_name: 'İki Kişilik Sofra',
    username: 'ikikisiliksofra',
    type: 'romantic',
    locale: 'tr',
    timezone: 'Europe/Istanbul',
    title: draft.title,
    status: 'needs_review',
    revision: 4,
    generation: 1,
    manual_preparation: false,
    preparation_brief: null as string | null,
    review_passed: true as boolean | null,
    scheduled_at: '2099-10-21T16:30:00Z',
    published_at: null,
    submitted_recipe_id: null,
    cover_image: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      url: 'https://private.example.test/cover',
      path: 'PRIVATE_AI_IMAGE_PATH',
      width: 1080,
      height: 566
    },
    error_code: null,
    error_message: null,
    next_attempt_at: null,
    review_note: null,
    reviewed_by: null,
    models: { text: initialSettings.text_model, image: initialSettings.image_model },
    draft,
    ai_review: { approved: true, issues: [] as string[] },
    attempts: ['recipe', 'review', 'image'].map((stage, index) => ({
      id: index + 1,
      stage,
      status: 'completed',
      model: stage === 'image' ? initialSettings.image_model : initialSettings.text_model,
      generation: 1,
      usage: { input_tokens: 100, output_tokens: 100 },
      provider_request_id: 'test-request-' + index,
      reserved_usd: 0.5,
      estimated_usd: stage === 'image' ? 0.07 : 0.005,
      error_code: null,
      created_at: '2026-10-21T09:00:00Z',
      finished_at: '2026-10-21T09:01:00Z'
    })),
    api_key: 'PRIVATE_AI_SECRET_MUST_NOT_LEAK'
  }
  type FixturePublication = Omit<typeof initial, 'draft' | 'ai_review' | 'cover_image' | 'title'> & {
    draft: typeof draft | null
    ai_review: typeof initial.ai_review | null
    cover_image: typeof initial.cover_image | null
    title: string | null
  }
  let settings = structuredClone(initialSettings)
  let row: FixturePublication = structuredClone(initial)
  let progressReads = 0
  const manualRequests = new Map<string, { fingerprint: string, row: FixturePublication }>()
  const requests: { path: string, method?: string, payload?: Record<string, unknown> }[] = []
  let failure = false
  async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
    const parts: Buffer[] = []
    for await (const part of req) parts.push(Buffer.from(part))
    return JSON.parse(Buffer.concat(parts).toString() || '{}')
  }
  async function handle(req: IncomingMessage, res: ServerResponse, url: URL) {
    if (!url.pathname.startsWith('/api/admin/ai-publication')) return false
    const send = (status: number, payload: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(payload))
      return true
    }
    const payload = ['PUT', 'POST', 'PATCH'].includes(req.method || '')
      ? await body(req)
      : undefined
    requests.push({ path: url.pathname + url.search, method: req.method, payload })
    if (failure) return send(503, { message: 'AI fixture unavailable' })
    if (url.pathname === '/api/admin/ai-publication-settings') {
      if (req.method === 'PUT' && payload) {
        if (payload.revision !== settings.revision)
          return send(409, { message: 'Ayarlar değişti.' })
        settings = { ...settings, ...payload, revision: settings.revision + 1 }
      }
      return send(200, { data: { ...settings, api_key: 'PRIVATE_AI_SECRET_MUST_NOT_LEAK' } })
    }
    if (url.pathname === '/api/admin/ai-publication-profiles') return send(200, { data: profiles })
    if (url.pathname.startsWith('/api/admin/ai-publication-profiles/')) {
      const profile = profiles.find(item => item.id === Number(url.pathname.split('/').at(-1)))
      if (!profile || !payload) return send(404, {})
      if (payload.revision !== profile.revision) return send(409, { message: 'Profil değişti.' })
      Object.assign(profile, payload, { revision: profile.revision + 1 })
      return send(200, { data: profile })
    }
    if (url.pathname === '/api/admin/ai-publications/prepare' && payload) {
      const key = String(payload.request_id)
      const fingerprint = JSON.stringify({ profile_id: payload.profile_id, brief: payload.brief || '' })
      const existing = manualRequests.get(key)
      if (existing) return send(existing.fingerprint === fingerprint ? 200 : 409,
        existing.fingerprint === fingerprint ? { data: existing.row } : { message: 'İstek değişmiş.' })
      const profile = profiles.find(item => item.id === payload.profile_id)
      if (!profile) return send(422, { message: 'AI profili seçin.' })
      row = { ...structuredClone(initial), id: 82 + manualRequests.size, profile_id: profile.id,
        user_id: profile.user_id, author_name: profile.name, username: profile.username,
        type: profile.type, locale: profile.locale, manual_preparation: true,
        preparation_brief: typeof payload.brief === 'string' ? payload.brief : null,
        status: 'planned', draft: null, ai_review: null, cover_image: null, title: null,
        attempts: [], scheduled_at: new Date().toISOString() }
      progressReads = 0
      manualRequests.set(key, { fingerprint, row })
      return send(201, { data: row })
    }
    if (url.pathname === '/api/admin/ai-publications') {
      if (req.method === 'POST' && payload) {
        return send(200, {
          data: {
            ...row,
            id: 82,
            profile_id: payload.profile_id,
            scheduled_at: payload.scheduled_at,
            status: 'planned',
            draft: null,
            cover_image: null,
            ai_review: null,
            attempts: [],
            title: null
          }
        })
      }
      const matches
        = (!url.searchParams.get('status')
          || url.searchParams.get('status') === 'all'
          || url.searchParams.get('status') === row.status)
        && (!url.searchParams.get('user_id')
          || Number(url.searchParams.get('user_id')) === row.user_id)
      return send(200, {
        data: matches ? [row] : [],
        meta: { current_page: 1, per_page: 10, total: matches ? 1 : 0, last_page: 1 }
      })
    }
    const match = url.pathname.match(/^\/api\/admin\/ai-publications\/(\d+)(?:\/([a-z-]+))?$/)
    if (!match || Number(match[1]) !== row.id) return send(404, {})
    if (!match[2] && req.method === 'GET' && row.manual_preparation && ['planned', 'generating'].includes(row.status)) {
      progressReads++
      row.status = 'generating'
      if (progressReads >= 2) {
        row.draft = structuredClone(draft)
        row.title = draft.title
      }
      if (progressReads >= 3) row.ai_review = { approved: true, issues: [] }
      if (progressReads >= 4) {
        row.status = 'needs_review'
        row.cover_image = structuredClone(initial.cover_image)
        row.attempts = structuredClone(initial.attempts)
      }
    }
    if (match[2] === 'cover') {
      res.writeHead(200, { 'Content-Type': 'image/png' })
      res.end(Buffer.from(reviewPhotos[0]!, 'base64'))
      return true
    }
    if (payload) {
      if (payload.revision !== row.revision)
        return send(409, { message: 'Tarif başka bir pencerede değişti.' })
      if (match[2] === 'publish-now') {
        if (!['needs_review', 'ready'].includes(row.status)) return send(409, { message: 'Bu tarif zaten yayınlanmış.' })
        row.status = 'published'
        row.published_at = new Date().toISOString()
        row.submitted_recipe_id = 201
      }
      if (match[2] === 'approve') row.status = 'ready'
      if (match[2] === 'reject') row.status = 'rejected'
      if (match[2] === 'cancel') row.status = 'cancelled'
      if (['retry', 'regenerate'].includes(match[2] || '') || req.method === 'PATCH')
        row.status = 'planned'
      if (req.method === 'PATCH')
        Object.assign(row, {
          draft: payload.draft,
          title: (payload.draft as typeof draft).title,
          ai_review: null,
          cover_image: null
        })
      row.revision++
    }
    return send(200, { data: row })
  }
  return {
    handle,
    requests,
    reset: () => {
      settings = structuredClone(initialSettings)
      row = structuredClone(initial)
      requests.length = 0
      manualRequests.clear()
      progressReads = 0
      failure = false
    },
    requireCorrection: () => {
      row.title = 'Portakal Kokulu İrmik Muhallebisi'
      row.manual_preparation = true
      row.preparation_brief = 'spoonful'
      row.review_passed = false
      row.ai_review = { approved: false, issues: ['İstenen Spoonful yerine başka bir tarif hazırlanmış.'] }
      row.cover_image = null
      row.status = 'needs_review'
    },
    fail: (value: boolean) => {
      failure = value
    }
  }
}

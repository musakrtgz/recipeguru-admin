import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { reviewPhotos } from './reviewPhotos.ts'
import type { Advertisement } from '../../shared/types/advertisements'

export function createAdvertisementUpstream() {
  const requests: { path: string, method: string, fields?: Record<string, unknown> }[] = []
  const initial: Advertisement[] = [31, 32, 33].map((id, index) => ({
    id,
    title: ['Haftanın lezzeti', 'Şefin seçimi', 'Mevsimin tarifi'][index]!,
    sponsor_name: ['RecipeGuru Test', 'Mutfak Atölyesi', 'RecipeGuru Test'][index]!,
    body: 'Yeni tatları keşfedin.',
    cta_label: 'Tarifi incele',
    destination:
      id === 31
        ? { type: 'external', url: 'https://example.test/kampanya' }
        : { type: id === 32 ? 'recipe' : 'submitted_recipe', id: id === 32 ? 126 : 21 },
    image: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    locale: index === 1 ? 'tr' : null,
    is_active: index === 0,
    starts_at: '2026-10-01T09:00:00Z',
    ends_at: '2099-10-31T18:00:00Z',
    weight: index + 1,
    daily_user_cap: 3,
    max_impressions: null,
    impressions_count: 1280 - index * 200,
    clicks_count: 64 - index * 10,
    ctr_percent: 5,
    revision: 1,
    deleted_at: index === 2 ? '2026-10-18T10:00:00Z' : null
  }))
  let items = structuredClone(initial)
  let settings = { enabled: true, organic_interval: 3 }
  let next = 34
  let failure = false
  async function raw(req: IncomingMessage) {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
    return new Uint8Array(Buffer.concat(chunks))
  }
  async function handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
    const imagePath = url.pathname.match(/^\/api\/advertisements\/(\d+)\/images\/([a-f0-9-]+)$/)
    if (!url.pathname.startsWith('/api/admin/advertisement') && !imagePath) return false
    const method = req.method || 'GET'
    const record: (typeof requests)[number] = { path: url.pathname, method }
    requests.push(record)
    const send = (status: number, data?: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(data === undefined ? undefined : JSON.stringify(data))
      return true
    }
    if (imagePath) {
      const item = items.find(
        ad => ad.id === Number(imagePath[1]) && ad.image.id === imagePath[2]
      )
      if (!item) return send(404, { message: 'Görsel bulunamadı.' })
      res.writeHead(200, { 'Content-Type': 'image/png' })
      res.end(Buffer.from(reviewPhotos[1]!, 'base64'))
      return true
    }
    if (url.pathname === '/api/admin/advertisement-settings') {
      if (method === 'PUT') {
        const body = JSON.parse(new TextDecoder().decode(await raw(req)))
        settings = body
        record.fields = body
      }
      return send(200, { data: settings })
    }
    if (method === 'GET' && url.pathname === '/api/admin/advertisements') {
      if (failure) return send(500, { message: 'PRIVATE_AD_DATABASE_FAILURE' })
      const search = url.searchParams.get('q')?.toLocaleLowerCase('tr') || ''
      const status = url.searchParams.get('status') || 'all'
      const type = url.searchParams.get('destination_type') || 'all'
      const page = Number(url.searchParams.get('page') || 1)
      const size = Number(url.searchParams.get('per_page') || 10)
      const rows = items
        .filter(
          ad =>
            (!search
              || [ad.title, ad.sponsor_name].some(value =>
                value.toLocaleLowerCase('tr').includes(search)
              ))
              && (type === 'all' || type === ad.destination.type)
              && (status === 'all'
                || (status === 'archived' && ad.deleted_at)
                || (!ad.deleted_at && (status === 'enabled' ? ad.is_active : !ad.is_active)))
        )
        .sort((a, b) => b.id - a.id)
      return send(200, {
        data: rows
          .map(ad => ({ ...ad, image_path: 'PRIVATE_STORE_PATH' }))
          .slice((page - 1) * size, page * size),
        meta: {
          current_page: page,
          per_page: size,
          last_page: Math.max(1, Math.ceil(rows.length / size)),
          total: rows.length
        }
      })
    }
    const match = url.pathname.match(/^\/api\/admin\/advertisements\/(\d+)(\/report)?$/)
    let item = match ? items.find(ad => ad.id === Number(match[1])) : undefined
    if (match && !item) return send(404, { message: 'Kampanya bulunamadı.' })
    if (match?.[2] && item) {
      const from = url.searchParams.get('from')!
      const to = url.searchParams.get('to')!
      const days = Math.floor((Date.parse(to) - Date.parse(from)) / 86400000) + 1
      const views = Math.min(item.impressions_count, days * 30)
      const clicks = Math.min(item.clicks_count, days * 2, views)
      const daily = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.parse(from) + i * 86400000).toISOString().slice(0, 10),
        impressions: Math.floor(views / days) + (i < views % days ? 1 : 0),
        clicks: Math.floor(clicks / days) + (i < clicks % days ? 1 : 0)
      }))
      return send(200, {
        data: {
          advertisement_id: item.id,
          from,
          to,
          timezone: 'UTC',
          impressions: views,
          clicks,
          unique_viewers: Math.ceil(views * 0.7),
          attributed_clicks: clicks,
          ctr_percent: views ? Math.round((clicks / views) * 10000) / 100 : 0,
          lifetime: { impressions: item.impressions_count, clicks: item.clicks_count },
          daily
        }
      })
    }
    if (method === 'GET' && item)
      return send(200, { data: { ...item, image_path: 'PRIVATE_STORE_PATH' } })
    if (item?.deleted_at) return send(404, { message: 'Arşivlenmiş kampanya düzenlenemez.' })
    if (method === 'DELETE' && item) {
      item.deleted_at = new Date().toISOString()
      item.is_active = false
      item.revision++
      return send(204)
    }
    if (method === 'PATCH' && item) {
      const body = JSON.parse(new TextDecoder().decode(await raw(req)))
      record.fields = body
      if (body.expected_revision !== item.revision)
        return send(409, { message: 'Kampanya değişti. Günceli yükleyin.' })
      item.is_active = body.is_active
      item.revision++
      return send(200, { data: item })
    }
    if (method === 'POST') {
      const form = await new Response(await raw(req), {
        headers: { 'Content-Type': String(req.headers['content-type']) }
      }).formData()
      const data = Object.fromEntries([...form].filter(([key]) => key !== 'image')) as Record<
        string,
        string
      >
      record.fields = { ...data, imageName: (form.get('image') as File | null)?.name }
      if (item && (data._method !== 'PUT' || Number(data.expected_revision) !== item.revision))
        return send(409, { message: 'Kampanya değişti. Günceli yükleyin.' })
      const fresh: Advertisement = {
        id: item?.id || next++,
        title: data.title!,
        sponsor_name: data.sponsor_name!,
        body: data.body || null,
        cta_label: data.cta_label || null,
        destination:
          data.destination_type === 'external'
            ? { type: 'external', url: data.external_url! }
            : {
                type: data.destination_type as 'recipe' | 'submitted_recipe',
                id: Number(data.destination_id)
              },
        image: form.has('image') ? { id: randomUUID() } : item!.image,
        locale: (data.locale as 'tr' | 'en') || null,
        is_active: data.is_active === '1',
        starts_at: data.starts_at!,
        ends_at: data.ends_at!,
        weight: Number(data.weight),
        daily_user_cap: Number(data.daily_user_cap),
        max_impressions: data.max_impressions ? Number(data.max_impressions) : null,
        impressions_count: item?.impressions_count || 0,
        clicks_count: item?.clicks_count || 0,
        ctr_percent: item?.ctr_percent || 0,
        revision: (item?.revision || 0) + 1,
        deleted_at: null
      }
      if (item) Object.assign(item, fresh)
      else {
        items.push(fresh)
        item = fresh
      }
      return send(match ? 200 : 201, { data: item })
    }
    return send(404, { message: 'Bulunamadı.' })
  }
  return {
    handle,
    requests,
    reset: () => {
      items = structuredClone(initial)
      settings = { enabled: true, organic_interval: 3 }
      next = 34
    },
    fail: (value: boolean) => {
      failure = value
    }
  }
}

import { z } from 'zod'
import type { Advertisement, AdvertisementDraft, AdvertisementPage } from '../types/advertisements'

export const adTypes = [
  { label: 'Harici bağlantı', value: 'external' },
  { label: 'Hazır tarif', value: 'recipe' },
  { label: 'Kullanıcının tarifi', value: 'submitted_recipe' }
]
export const adStatuses = [
  { label: 'Tüm kampanyalar', value: 'all' },
  { label: 'Etkin', value: 'enabled' },
  { label: 'Durdurulanlar', value: 'paused' },
  { label: 'Arşiv', value: 'archived' }
]
export const adQuerySchema = z.object({
  q: z.string().trim().max(180).default(''),
  status: z.enum(['all', 'enabled', 'paused', 'archived']).default('all'),
  destination_type: z.enum(['all', 'external', 'recipe', 'submitted_recipe']).default('all'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10)
})
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
    } catch {
      return false
    }
  }, 'http veya https ile başlayan geçerli bir bağlantı yazın.')
const integer = (min: number, max = Number.MAX_SAFE_INTEGER) =>
  z.coerce
    .number()
    .int('Tam sayı yazın.')
    .min(min, `En az ${min} olmalı.`)
    .max(max, `En fazla ${max} olabilir.`)
const nullableNumber = z.preprocess(
  value => (value === '' || value == null ? null : value),
  integer(1).nullable()
)
const nullableText = (max: number) =>
  z.preprocess(
    value => (value === '' || value == null ? null : value),
    z.string().trim().max(max).nullable()
  )
export const adSaveSchema = z
  .strictObject({
    title: z.string().trim().min(1, 'Reklam başlığını yazın.').max(180),
    sponsor_name: z.string().trim().min(1, 'Sponsor adını yazın.').max(120),
    body: nullableText(2000),
    cta_label: nullableText(40),
    destination_type: z.enum(['external', 'recipe', 'submitted_recipe']),
    destination_id: nullableNumber,
    external_url: z.preprocess(
      value => (value === '' || value == null ? null : value),
      httpUrl.nullable()
    ),
    locale: z.preprocess(
      value => (value === '' || value === 'all' || value == null ? null : value),
      z.enum(['tr', 'en']).nullable()
    ),
    is_active: z.preprocess(
      value => (value === '1' ? true : value === '0' ? false : value),
      z.boolean()
    ),
    starts_at: z.iso.datetime({ offset: true, error: 'Başlangıç tarihini seçin.' }),
    ends_at: z.iso.datetime({ offset: true, error: 'Bitiş tarihini seçin.' }),
    weight: integer(1, 100),
    daily_user_cap: integer(1, 100),
    max_impressions: nullableNumber,
    expected_revision: z.preprocess(
      value => (value === '' || value == null ? undefined : value),
      integer(1).optional()
    )
  })
  .superRefine((value, ctx) => {
    if (Date.parse(value.ends_at) <= Date.parse(value.starts_at))
      ctx.addIssue({
        code: 'custom',
        path: ['ends_at'],
        message: 'Bitiş, başlangıç tarihinden sonra olmalı.'
      })
    if (value.destination_type === 'external') {
      if (!value.external_url)
        ctx.addIssue({
          code: 'custom',
          path: ['external_url'],
          message: 'Yönlendirilecek bağlantıyı yazın.'
        })
      if (value.destination_id != null)
        ctx.addIssue({
          code: 'custom',
          path: ['destination_id'],
          message: 'Harici bağlantıda tarif seçilmez.'
        })
    } else {
      if (!value.destination_id)
        ctx.addIssue({
          code: 'custom',
          path: ['destination_id'],
          message: 'Reklamın açacağı tarifi seçin.'
        })
      if (value.external_url)
        ctx.addIssue({
          code: 'custom',
          path: ['external_url'],
          message: 'Tarif reklamında harici bağlantı kullanılmaz.'
        })
    }
  })
export const adToggleSchema = z.strictObject({
  is_active: z.boolean(),
  expected_revision: z.number().int().positive()
})
export const adSettingsSchema = z.strictObject({
  enabled: z.boolean(),
  organic_interval: integer(1, 50)
})
const day = z.iso.date('Geçerli bir tarih seçin.')
export const adReportQuerySchema = z.object({ from: day, to: day }).superRefine((value, ctx) => {
  const days = (Date.parse(value.to) - Date.parse(value.from)) / 86400000
  if (days < 0 || days > 365)
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'En fazla 366 günlük geçerli bir aralık seçin.'
    })
})
export const adTargetQuerySchema = z.object({
  type: z.enum(['recipe', 'submitted_recipe']),
  q: z.string().trim().max(150).default(''),
  page: integer(1, 100000).default(1)
})
const count = z.number().int().nonnegative()
export const advertisementSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  sponsor_name: z.string(),
  body: z.string().nullable(),
  cta_label: z.string().nullable(),
  destination: z.union([
    z.object({ type: z.literal('external'), url: httpUrl }),
    z.object({ type: z.enum(['recipe', 'submitted_recipe']), id: z.number().int().positive() })
  ]),
  image: z.object({ id: z.uuid() }),
  locale: z.enum(['tr', 'en']).nullable(),
  is_active: z.boolean(),
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }),
  weight: count,
  daily_user_cap: count,
  max_impressions: count.nullable(),
  impressions_count: count,
  clicks_count: count,
  ctr_percent: z.number().nonnegative(),
  revision: z.number().int().positive(),
  deleted_at: z.string().nullable()
})
export const advertisementReportSchema = z.object({
  advertisement_id: z.number().int().positive(),
  from: day,
  to: day,
  timezone: z.string(),
  impressions: count,
  clicks: count,
  unique_viewers: count,
  attributed_clicks: count,
  ctr_percent: z.number().nonnegative(),
  lifetime: z.object({ impressions: count, clicks: count }),
  daily: z.array(z.object({ date: day, impressions: count, clicks: count })).max(366)
})
export function toAdvertisementPage(input: unknown): AdvertisementPage {
  const data = z
    .object({
      data: z.array(advertisementSchema),
      meta: z.object({
        current_page: z.number().int().positive(),
        last_page: z.number().int().positive(),
        total: count,
        per_page: z.number().int().positive()
      })
    })
    .parse(input)
  return {
    items: data.data,
    page: data.meta.current_page,
    lastPage: data.meta.last_page,
    pageSize: data.meta.per_page,
    total: data.meta.total
  }
}
export const maxAdImageSize = 10 * 1024 * 1024
export const adImageTypes = ['image/jpeg', 'image/png', 'image/webp']
export function adImageError(file: { size: number, type: string } | null, required = false) {
  if (!file) return required ? 'Reklam görselini seçin.' : ''
  if (!adImageTypes.includes(file.type)) return 'JPG, PNG veya WebP görseli seçin.'
  return file.size <= 0 || file.size > maxAdImageSize
    ? 'Görsel en fazla 10 MB ve boş olmayan bir dosya olmalı.'
    : ''
}
export function localDateTime(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19)
}
export function isoDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
export function adDraft(ad: Advertisement | null): AdvertisementDraft {
  const now = new Date()
  return {
    title: ad?.title || '',
    sponsor_name: ad?.sponsor_name || '',
    body: ad?.body || '',
    cta_label: ad?.cta_label || '',
    destination_type: ad?.destination.type || 'external',
    destination_id:
      ad?.destination.type !== 'external' && ad?.destination.id ? String(ad.destination.id) : '',
    external_url: ad?.destination.type === 'external' ? ad.destination.url : '',
    locale: ad?.locale || 'all',
    is_active: ad?.is_active ?? false,
    starts_at: localDateTime(ad?.starts_at || now.toISOString()),
    ends_at: localDateTime(ad?.ends_at || new Date(now.getTime() + 30 * 86400000).toISOString()),
    weight: String(ad?.weight ?? 1),
    daily_user_cap: String(ad?.daily_user_cap ?? 3),
    max_impressions: ad?.max_impressions == null ? '' : String(ad.max_impressions)
  }
}
export function adPhase(ad: Advertisement, now = Date.now()) {
  if (ad.deleted_at) return 'Arşivlendi'
  if (!ad.is_active) return 'Durduruldu'
  if (Date.parse(ad.ends_at) <= now) return 'Süresi doldu'
  if (ad.max_impressions != null && ad.impressions_count >= ad.max_impressions)
    return 'Gösterim sınırında'
  if (Date.parse(ad.starts_at) > now) return 'Planlandı'
  return 'Etkin'
}
export function adTargetLabel(ad: Advertisement) {
  return ad.destination.type === 'external'
    ? new URL(ad.destination.url).hostname
    : `${ad.destination.type === 'recipe' ? 'Hazır tarif' : 'Kullanıcı tarifi'} #${ad.destination.id}`
}
export function reportDates(days = 30) {
  const now = new Date()
  return {
    from: new Date(now.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10)
  }
}
export function adPercent(value: number) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value) + '%'
}

export function adDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

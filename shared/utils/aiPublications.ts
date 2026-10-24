import { z } from 'zod'
import { recipeEditSchema } from './recipeReview'

export const aiStatuses = [
  { value: 'planned', label: 'Planlandı' },
  { value: 'generating', label: 'Üretiliyor' },
  { value: 'needs_review', label: 'Onay bekliyor' },
  { value: 'ready', label: 'Yayın bekliyor' },
  { value: 'published', label: 'Yayınlandı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'failed', label: 'İşlem başarısız' },
  { value: 'cancelled', label: 'İptal edildi' }
] as const
const status = z.enum([
  'planned',
  'generating',
  'needs_review',
  'ready',
  'published',
  'rejected',
  'failed',
  'cancelled'
])
const id = z.number().int().positive()
export const aiQuerySchema = z.object({
  status: z.union([status, z.literal('all')]).default('all'),
  user_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10)
})
export const aiSettingsWrite = z
  .strictObject({
    revision: id,
    enabled: z.boolean(),
    require_admin_review: z.boolean(),
    timezone: z.literal('Europe/Istanbul'),
    daily_budget_usd: z.coerce.number().min(0.1).max(100),
    request_reservation_usd: z.coerce.number().min(0.1).max(10),
    daily_publication_limit: z.coerce.number().int().min(1).max(21)
  })
  .refine(value => value.request_reservation_usd <= value.daily_budget_usd, {
    path: ['request_reservation_usd'],
    message: 'İstek payı günlük bütçeden büyük olamaz.'
  })
export const aiSettingsSchema = z.object({
  revision: id,
  enabled: z.boolean(),
  require_admin_review: z.boolean(),
  timezone: z.string(),
  daily_budget_usd: z.number(),
  request_reservation_usd: z.number(),
  daily_publication_limit: z.number(),
  provider_configured: z.boolean(),
  text_model: z.string(),
  image_model: z.string(),
  last_tick_at: z.string().nullable(),
  last_worker_at: z.string().nullable(),
  today: z.object({
    date: z.string(),
    requests: z.number(),
    estimated_usd: z.number(),
    charged_usd: z.number(),
    unknown_requests: z.number()
  })
})
export const aiProfileWrite = z
  .strictObject({
    revision: id,
    enabled: z.boolean(),
    locale: z.enum(['tr', 'en']),
    times: z
      .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Saatleri 07:30 biçiminde yazın.'))
      .min(1)
      .max(3),
    instruction: z.string().trim().min(1).max(4000),
    image_style: z.string().trim().min(1).max(2000)
  })
  .refine(value => new Set(value.times).size === value.times.length, {
    path: ['times'],
    message: 'Aynı saati iki kez eklemeyin.'
  })
export const aiProfileSchema = z.object({
  id,
  user_id: id,
  name: z.string(),
  username: z.string().nullable(),
  type: z.string().nullable(),
  type_label: z.string(),
  available: z.boolean(),
  revision: id,
  enabled: z.boolean(),
  locale: z.enum(['tr', 'en']),
  times: z.array(z.string()),
  instruction: z.string(),
  image_style: z.string()
})
export const aiRecipeSchema = recipeEditSchema.options[0].omit({ revision: true }).extend({
  ingredients: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(200)
        .regex(/\p{N}/u, 'Her malzemeye miktar ekleyin.')
        .regex(/^[^\r\n]*$/)
    )
    .min(1)
    .max(100)
})
const timestamp = z.string().datetime({ offset: true })
export const aiCreateSchema = z.strictObject({ profile_id: id, scheduled_at: timestamp })
export const aiPrepareSchema = z.strictObject({
  profile_id: id,
  request_id: z.string().uuid(),
  brief: z.string().trim().max(1000, 'Ek not en fazla 1000 karakter olabilir.').optional()
})
export const aiEditSchema = z.strictObject({
  revision: id,
  draft: aiRecipeSchema,
  scheduled_at: timestamp.optional()
})
export const aiActionSchema = z.strictObject({
  revision: id,
  note: z.string().trim().max(2000).optional()
})
export const aiActions = ['approve', 'publish-now', 'reject', 'retry', 'regenerate', 'cancel'] as const
export type AiAction = (typeof aiActions)[number]
export const aiPublicationSchema = z.object({
  id,
  user_id: id.nullable(),
  profile_id: id.nullable(),
  author_name: z.string(),
  username: z.string().nullable(),
  type: z.string(),
  locale: z.string(),
  timezone: z.string(),
  title: z.string().nullable(),
  status,
  revision: id,
  generation: id,
  manual_preparation: z.boolean().default(false),
  preparation_brief: z.string().nullable().default(null),
  review_passed: z.boolean().nullable().default(null),
  scheduled_at: timestamp,
  published_at: timestamp.nullable(),
  submitted_recipe_id: id.nullable(),
  cover_image: z.object({
    id: z.string(), url: z.string(),
    width: z.number().int().positive().max(4096).nullish(),
    height: z.number().int().positive().max(4096).nullish()
  }).nullable(),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  next_attempt_at: timestamp.nullable(),
  review_note: z.string().nullable(),
  reviewed_by: id.nullable(),
  models: z.object({ text: z.string(), image: z.string() }),
  draft: aiRecipeSchema.nullable().optional(),
  ai_review: z
    .object({
      approved: z.boolean(), issues: z.array(z.string()),
      request_fulfilled: z.boolean().optional(),
      requested_recipe: z.string().nullable().optional()
    })
    .nullable()
    .optional(),
  attempts: z
    .array(
      z.object({
        id,
        stage: z.string(),
        status: z.string(),
        model: z.string(),
        generation: id,
        usage: z.record(z.string(), z.unknown()).nullable(),
        provider_request_id: z.string().nullable(),
        reserved_usd: z.number(),
        estimated_usd: z.number().nullable(),
        error_code: z.string().nullable(),
        created_at: timestamp.nullable(),
        finished_at: timestamp.nullable()
      })
    )
    .optional()
})
export type AiPublication = z.output<typeof aiPublicationSchema>
export type AiProfile = z.output<typeof aiProfileSchema>
export type AiSettings = z.output<typeof aiSettingsSchema>
export function toAiPublication(input: unknown): AiPublication {
  const value = aiPublicationSchema.parse(input)
  if (value.cover_image)
    value.cover_image.url = '/api/ai-publications/' + value.id + '/cover?v=' + value.revision
  return value
}
export function toAiPage(input: unknown) {
  const value = z
    .object({
      data: z.array(z.unknown()),
      meta: z.object({
        current_page: z.number(),
        per_page: z.number(),
        total: z.number(),
        last_page: z.number()
      })
    })
    .parse(input)
  return {
    items: value.data.map(toAiPublication),
    page: value.meta.current_page,
    perPage: value.meta.per_page,
    total: value.meta.total,
    lastPage: value.meta.last_page
  }
}
export function aiStatusLabel(value: string, reviewPassed: boolean | null = null) {
  if (value === 'needs_review' && reviewPassed === false) return 'Düzeltme gerekiyor'
  return aiStatuses.find(item => item.value === value)?.label || value
}
export function aiStatusColor(
  value: string, reviewPassed: boolean | null = null
): 'primary' | 'success' | 'warning' | 'error' | 'neutral' {
  if (value === 'needs_review' && reviewPassed === false) return 'warning'
  return value === 'published'
    ? 'success'
    : ['failed', 'rejected'].includes(value)
        ? 'error'
        : value === 'needs_review'
          ? 'warning'
          : ['ready', 'generating'].includes(value)
              ? 'primary'
              : 'neutral'
}
export function aiDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/Istanbul'
      }).format(new Date(value))
    : 'Henüz çalışmadı'
}
export function aiMoney(value: number | null) {
  return value === null
    ? 'Belirsiz'
    : new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      }).format(value)
}

import { z } from 'zod'
import type { AdminUser, ApiEnvelope, RecipePage, SubmittedRecipe } from '../types/api'

export const loginSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi yazın.').max(255).trim(),
  password: z.string().min(1, 'Şifrenizi yazın.').max(1024)
})
export const reviewSchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']),
    revision: z.number().int().positive(),
    review_note: z.string().trim().max(2000).optional()
  })
  .refine(value => value.status !== 'rejected' || Boolean(value.review_note), {
    path: ['review_note'],
    message: 'Reddetme nedenini yazın.'
  })
export const recipeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending')
})
export const periodSchema = z.enum(['all', '7', '30']).default('all')
export const adminUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  surname: z.string().nullable(),
  email: z.email(),
  role: z.literal('admin'),
  is_active: z.literal(true),
  is_blocked: z.literal(false)
})
export function toAdminUser(input: unknown): AdminUser {
  const { id, name, surname, email, role } = adminUserSchema.parse(input)
  return { id, name, surname, email, role }
}
export function extractLogin(input: ApiEnvelope<unknown>): {
  user: AdminUser
  token: string
} {
  const raw = z
    .object({
      access_token: z.object({ token: z.string().min(10).max(2048) })
    })
    .passthrough()
    .parse(input.data)
  return { user: toAdminUser(raw), token: raw.access_token.token }
}
export function toRecipePage(input: ApiEnvelope<SubmittedRecipe[]>): RecipePage {
  if (!Array.isArray(input.data) || !input.meta || !Number.isFinite(input.meta.total)) {
    throw new Error('Tarif listesi beklenen biçimde dönmedi.')
  }
  return {
    items: input.data,
    page: input.meta.current_page,
    lastPage: input.meta.last_page,
    total: input.meta.total
  }
}
export function isSameOrigin(origin: string | undefined, siteUrl: string): boolean {
  if (!origin || origin === 'null') return false
  try {
    return new URL(origin).origin === new URL(siteUrl).origin
  } catch {
    return false
  }
}
export function safeRedirect(value: unknown): string {
  return typeof value === 'string'
    && /^\/(?!\/)[a-zA-Z0-9/_?=&%-]*$/.test(value)
    && !value.startsWith('/login')
    && !/%(?:2f|5c)/i.test(value)
    ? value
    : '/'
}

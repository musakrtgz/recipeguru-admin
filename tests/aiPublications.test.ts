import { describe, expect, it } from 'vitest'
import {
  aiQuerySchema,
  aiSettingsWrite,
  aiProfileWrite,
  aiRecipeSchema,
  aiCreateSchema,
  aiPrepareSchema,
  aiEditSchema,
  aiActionSchema,
  toAiPublication,
  aiDate,
  aiStatusLabel,
  aiStatusColor
} from '../shared/utils/aiPublications'

const recipe = {
  title: 'Makarna',
  ingredients: ['200 g makarna'],
  preparation: 'Makarnayı haşlayıp sıcak servis edin.',
  person_count: 2,
  cooking_time: 20,
  tips: null
}
const profile = {
  revision: 1,
  enabled: true,
  locale: 'tr',
  times: ['07:30'],
  instruction: 'Kahvaltı tarifleri hazırla.',
  image_style: 'Sabah ışığı'
}
const settings = {
  revision: 1,
  enabled: false,
  require_admin_review: true,
  timezone: 'Europe/Istanbul',
  daily_budget_usd: 5,
  request_reservation_usd: 0.5,
  daily_publication_limit: 7
}
describe('AI publication contracts', () => {
  it('defaults list filters without enabling publishing', () => {
    expect(aiQuerySchema.parse({})).toEqual({ status: 'all', page: 1, per_page: 10 })
    expect(aiSettingsWrite.parse(settings).enabled).toBe(false)
  })
  it.each([
    ['25:00'],
    ['07:70'],
    ['7:30'],
    ['07:30', '07:30'],
    ['01:00', '02:00', '03:00', '04:00']
  ])('rejects invalid or duplicate times %j', (...times) => {
    expect(aiProfileWrite.safeParse({ ...profile, times }).success).toBe(false)
  })
  it('accepts a profile schedule and language', () => {
    expect(aiProfileWrite.parse({ ...profile, times: ['07:30', '12:00'] }).times).toHaveLength(2)
  })
  it('requires quantities and structured preparation', () => {
    expect(aiRecipeSchema.safeParse(recipe).success).toBe(true)
    expect(aiRecipeSchema.safeParse({ ...recipe, ingredients: ['Makarna'] }).success).toBe(false)
    expect(aiRecipeSchema.safeParse({ ...recipe, preparation: '' }).success).toBe(false)
  })
  it('blocks owner, status and provider fields supplied by a client', () => {
    expect(
      aiCreateSchema.safeParse({ profile_id: 1, scheduled_at: '2026-10-21T10:00:00Z', user_id: 9 })
        .success
    ).toBe(false)
    expect(
      aiEditSchema.safeParse({ revision: 1, draft: recipe, status: 'published' }).success
    ).toBe(false)
    expect(aiSettingsWrite.safeParse({ ...settings, api_key: 'bad' }).success).toBe(false)
  })
  it('accepts manual preparation without a schedule and rejects unsafe extra fields', () => {
    const request = { profile_id: 7, request_id: 'cffcf06a-761c-4cef-9914-5c6a84126d5a', brief: '  Sebzeli makarna  ' }
    expect(aiPrepareSchema.parse(request).brief).toBe('Sebzeli makarna')
    expect(aiPrepareSchema.safeParse({ ...request, request_id: 'invalid' }).success).toBe(false)
    expect(aiPrepareSchema.safeParse({ ...request, brief: 'a'.repeat(1001) }).success).toBe(false)
    expect(aiPrepareSchema.safeParse({ ...request, user_id: 12 }).success).toBe(false)
    expect(aiPrepareSchema.safeParse({ ...request, status: 'published' }).success).toBe(false)
    expect(aiPrepareSchema.safeParse({ ...request, manual_preparation: false }).success).toBe(false)
    expect(aiPrepareSchema.safeParse({ profile_id: 7, request_id: request.request_id }).success).toBe(true)
  })
  it('cannot reserve more than the daily budget', () => {
    expect(
      aiSettingsWrite.safeParse({
        ...settings,
        daily_budget_usd: 0.2,
        request_reservation_usd: 0.5
      }).success
    ).toBe(false)
  })
  it('requires explicit timestamp offsets and revisions', () => {
    expect(
      aiCreateSchema.safeParse({ profile_id: 1, scheduled_at: '2026-10-21T10:00:00' }).success
    ).toBe(false)
    expect(aiActionSchema.safeParse({ revision: 0 }).success).toBe(false)
  })
  it('strips server-private metadata and always proxies cover images', () => {
    const value = toAiPublication({
      id: 1,
      user_id: 7,
      profile_id: 1,
      author_name: 'Test',
      username: 'test',
      type: 'romantic',
      locale: 'tr',
      timezone: 'Europe/Istanbul',
      title: 'Tarif',
      status: 'needs_review',
      revision: 2,
      generation: 1,
      scheduled_at: '2026-10-21T10:00:00Z',
      published_at: null,
      submitted_recipe_id: null,
      cover_image: { id: 'image', url: 'https://evil.test/', path: 'secret-file' },
      error_code: null,
      error_message: null,
      next_attempt_at: null,
      review_note: null,
      reviewed_by: null,
      models: { text: 'model', image: 'image-model' },
      api_key: 'secret-key'
    })
    expect(value.cover_image?.url).toBe('/api/ai-publications/1/cover?v=2')
    expect(JSON.stringify(value)).not.toContain('secret')
    expect(JSON.stringify(value)).not.toContain('evil.test')
  })
  it('distinguishes a failed AI review from a draft awaiting admin approval', () => {
    expect(aiStatusLabel('needs_review', false)).toBe('Düzeltme gerekiyor')
    expect(aiStatusColor('needs_review', false)).toBe('warning')
    expect(aiStatusLabel('needs_review', true)).toBe('Onay bekliyor')
    expect(aiStatusLabel('needs_review')).toBe('Onay bekliyor')
    expect(aiStatusLabel('published', false)).toBe('Yayınlandı')
  })
  it('shows Istanbul schedule times explicitly', () => {
    expect(aiDate('2026-10-21T10:00:00Z')).toContain('13:00')
  })
})

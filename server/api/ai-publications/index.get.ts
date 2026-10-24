import { aiQuerySchema, toAiPage } from '#shared/utils/aiPublications'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const params = aiPayload(aiQuerySchema, getQuery(event))
  const response = await laravel(event, token).get('admin/ai-publications', { params })
  try {
    return toAiPage(response.data)
  } catch {
    throw createError({ statusCode: 502, message: 'AI yayın listesi okunamadı.' })
  }
})

import { aiProfileSchema } from '#shared/utils/aiPublications'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const response = await laravel(event, token).get('admin/ai-publication-profiles')
  return aiProfileSchema.array().parse(response.data.data)
})

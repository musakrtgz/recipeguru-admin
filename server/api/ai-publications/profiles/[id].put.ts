import { aiProfileSchema, aiProfileWrite } from '#shared/utils/aiPublications'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const id = aiId(event)
  const payload = aiPayload(aiProfileWrite, await readBody(event))
  const response = await laravel(event, token).put('admin/ai-publication-profiles/' + id, payload)
  return aiProfileSchema.parse(response.data.data)
})

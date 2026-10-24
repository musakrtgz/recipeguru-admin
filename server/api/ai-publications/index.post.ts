import { aiCreateSchema } from '#shared/utils/aiPublications'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const payload = aiPayload(aiCreateSchema, await readBody(event))
  const response = await laravel(event, token).post('admin/ai-publications', payload)
  return aiData(response.data)
})

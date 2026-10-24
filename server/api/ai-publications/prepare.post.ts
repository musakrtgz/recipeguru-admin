import { aiPrepareSchema } from '#shared/utils/aiPublications'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const payload = aiPayload(aiPrepareSchema, await readBody(event))
  const response = await laravel(event, token).post('admin/ai-publications/prepare', payload)
  return aiData(response.data)
})

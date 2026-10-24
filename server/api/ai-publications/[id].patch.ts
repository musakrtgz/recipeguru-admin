import { aiEditSchema } from '#shared/utils/aiPublications'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const payload = aiPayload(aiEditSchema, await readBody(event))
  const response = await laravel(event, token).patch(
    'admin/ai-publications/' + aiId(event),
    payload
  )
  return aiData(response.data)
})

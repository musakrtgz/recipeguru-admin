import { aiSettingsSchema, aiSettingsWrite } from '#shared/utils/aiPublications'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const payload = aiPayload(aiSettingsWrite, await readBody(event))
  const response = await laravel(event, token).put('admin/ai-publication-settings', payload)
  return aiSettingsSchema.parse(response.data.data)
})

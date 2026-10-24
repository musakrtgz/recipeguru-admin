import { aiSettingsSchema } from '#shared/utils/aiPublications'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const response = await laravel(event, token).get('admin/ai-publication-settings')
  return aiSettingsSchema.parse(response.data.data)
})

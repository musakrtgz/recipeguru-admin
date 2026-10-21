import { adSettingsSchema } from '#shared/utils/advertisements'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const response = await laravel(event, token).get('admin/advertisement-settings')
  const parsed = adSettingsSchema.safeParse(response.data.data)
  if (!parsed.success)
    throw createError({ statusCode: 502, message: 'Reklam ayarları yüklenemedi.' })
  return parsed.data
})

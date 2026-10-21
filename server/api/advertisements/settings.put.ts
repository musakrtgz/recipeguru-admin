import { adSettingsSchema } from '#shared/utils/advertisements'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const parsed = adSettingsSchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({
      statusCode: 422,
      message: 'Reklam sıklığını kontrol edin.',
      data: { errors: parsed.error.flatten().fieldErrors }
    })
  const response = await laravel(event, token).put('admin/advertisement-settings', parsed.data)
  return adSettingsSchema.parse(response.data.data)
})

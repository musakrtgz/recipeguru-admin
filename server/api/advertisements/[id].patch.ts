import { adToggleSchema } from '#shared/utils/advertisements'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const id = advertisementId(event)
  const parsed = adToggleSchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 422, message: 'Yayın durumunu kontrol edin.' })
  return advertisementData(
    (await laravel(event, token).patch(`admin/advertisements/${id}`, parsed.data)).data
  )
})

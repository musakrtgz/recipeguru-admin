import { adQuerySchema, toAdvertisementPage } from '#shared/utils/advertisements'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const parsed = adQuerySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 422, message: 'Reklam filtrelerini kontrol edin.' })
  const response = await laravel(event, token).get('admin/advertisements', { params: parsed.data })
  try {
    return toAdvertisementPage(response.data)
  } catch {
    throw createError({ statusCode: 502, message: 'Reklam listesi beklenen biçimde dönmedi.' })
  }
})

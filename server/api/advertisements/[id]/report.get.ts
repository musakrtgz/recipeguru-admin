import { adReportQuerySchema, advertisementReportSchema } from '#shared/utils/advertisements'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const id = advertisementId(event)
  const parsed = adReportQuerySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({
      statusCode: 422,
      message: 'Rapor tarihlerini kontrol edin.',
      data: { errors: parsed.error.flatten().fieldErrors }
    })
  const response = await laravel(event, token).get(`admin/advertisements/${id}/report`, {
    params: parsed.data
  })
  const data = advertisementReportSchema.safeParse(response.data.data)
  if (!data.success || data.data.advertisement_id !== Number(id))
    throw createError({ statusCode: 502, message: 'Reklam raporu beklenen biçimde dönmedi.' })
  return data.data
})

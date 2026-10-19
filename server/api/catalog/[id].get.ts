import { z } from 'zod'
import { toCatalogDetail } from '#shared/utils/catalog'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const id = z.coerce.number().int().positive().safeParse(getRouterParam(event, 'id'))
  const locale = z
    .string()
    .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/)
    .optional()
    .safeParse(getQuery(event).locale)
  if (!id.success) throw createError({ statusCode: 404, message: 'Tarif bulunamadı.' })
  if (!locale.success) throw createError({ statusCode: 422, message: 'Geçersiz tarif dili.' })
  const response = await laravel(event, token).get(`admin/recipes/${id.data}/preview`, {
    params: { locale: locale.data }
  })
  try {
    const result = toCatalogDetail(response.data.data)
    if (result.id !== id.data) throw new Error('Tarif kimliği eşleşmiyor.')
    return result
  } catch {
    throw createError({ statusCode: 502, message: 'Tarif detayı beklenen biçimde dönmedi.' })
  }
})

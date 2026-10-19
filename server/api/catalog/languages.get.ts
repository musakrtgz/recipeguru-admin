import { toCatalogLanguages } from '#shared/utils/catalog'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const response = await laravel(event, token).get('languages')
  try {
    return toCatalogLanguages(response.data)
  } catch {
    throw createError({ statusCode: 502, message: 'Dil seçenekleri yüklenemedi.' })
  }
})

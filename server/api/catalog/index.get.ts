import { catalogQuerySchema, toCatalogPage } from '#shared/utils/catalog'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const parsed = catalogQuerySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({
      statusCode: 422,
      message: 'Arama ve filtre bilgilerini kontrol edin.',
      data: { errors: parsed.error.flatten().fieldErrors }
    })
  const query = parsed.data
  const response = await laravel(event, token).get('admin/recipes', {
    params: {
      page: query.page,
      per_page: query.per_page,
      sort: query.sort,
      summary: 1,
      ...(query.q ? { 'filter[title]': query.q } : {}),
      ...(query.locale !== 'all' ? { 'filter[locale]': query.locale } : {})
    }
  })
  try {
    return toCatalogPage(response.data)
  } catch {
    throw createError({
      statusCode: 502,
      message: 'Tarif listesi beklenen biçimde dönmedi. Lütfen tekrar deneyin.'
    })
  }
})

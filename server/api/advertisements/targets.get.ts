import { adTargetQuerySchema } from '#shared/utils/advertisements'
import { toCatalogPage } from '#shared/utils/catalog'
import type { ApiEnvelope, SubmittedRecipe } from '#shared/types/api'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const parsed = adTargetQuerySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 422, message: 'Tarif aramasını kontrol edin.' })
  const { type, q, page } = parsed.data
  if (type === 'recipe') {
    const data = toCatalogPage(
      (
        await laravel(event, token).get('admin/recipes', {
          params: {
            page,
            per_page: 10,
            summary: 1,
            sort: '-id',
            ...(q ? { 'filter[title]': q } : {})
          }
        })
      ).data
    )
    return {
      items: data.items.map(item => ({
        id: item.id,
        title: item.title || `Tarif #${item.id}`,
        description: [item.locale?.toUpperCase(), item.cookingTime ? item.cookingTime + ' dk' : '']
          .filter(Boolean)
          .join(' · ')
      })),
      page: data.page,
      total: data.total,
      lastPage: data.lastPage
    }
  }
  const data = (
    await laravel(event, token).get<ApiEnvelope<SubmittedRecipe[]>>('admin/submitted-recipes', {
      params: {
        page,
        'per_page': 10,
        'filter[status]': 'approved',
        'for_advertisement': 1,
        ...(q ? { 'filter[title]': q } : {})
      }
    })
  ).data
  if (!Array.isArray(data.data) || !data.meta)
    throw createError({ statusCode: 502, message: 'Kullanıcı tarifleri yüklenemedi.' })
  return {
    items: data.data.map(item => ({
      id: item.id,
      title: item.title,
      description:
        [item.author?.name, item.author?.surname].filter(Boolean).join(' ') || 'Kullanıcı tarifi'
    })),
    page: data.meta.current_page,
    total: data.meta.total,
    lastPage: data.meta.last_page
  }
})

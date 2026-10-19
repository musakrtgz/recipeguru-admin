import { recipeQuerySchema, toRecipePage } from '#shared/utils/contracts'
import { adminConfig } from '#shared/config/admin'
import type { ApiEnvelope, SubmittedRecipe } from '#shared/types/api'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const parsed = recipeQuerySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({
      statusCode: 422,
      message: 'Geçersiz liste parametreleri.'
    })
  const { page, status } = parsed.data
  return toRecipePage(
    (
      await laravel(event, token).get<ApiEnvelope<SubmittedRecipe[]>>('admin/submitted-recipes', {
        params: {
          page,
          per_page: adminConfig.pagination.pageSize,
          sort: '-submitted_at',
          ...(status !== 'all' ? { 'filter[status]': status } : {})
        }
      })
    ).data
  )
})

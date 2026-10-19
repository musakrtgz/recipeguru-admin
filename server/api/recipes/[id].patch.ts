import type { ApiEnvelope, SubmittedRecipe } from '#shared/types/api'
import { recipeEditSchema, recipeEditErrors } from '#shared/utils/recipeReview'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^[1-9]\d*$/.test(id)) throw createError({ statusCode: 404 })
  const input = await readBody(event)
  const parsed = recipeEditSchema.safeParse(input)
  if (!parsed.success)
    throw createError({
      statusCode: 422,
      message: 'Tarif bilgilerini kontrol edin.',
      data: { errors: recipeEditErrors(input) }
    })
  return (
    await laravel(event, token).patch<ApiEnvelope<SubmittedRecipe>>(
      `admin/submitted-recipes/${id}`,
      parsed.data
    )
  ).data
})

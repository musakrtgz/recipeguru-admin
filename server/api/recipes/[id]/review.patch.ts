import { reviewSchema } from '#shared/utils/contracts'
import type { ApiEnvelope, SubmittedRecipe } from '#shared/types/api'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^[1-9]\d*$/.test(id)) throw createError({ statusCode: 404 })
  const parsed = reviewSchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({
      statusCode: 422,
      message: 'İnceleme bilgilerini kontrol edin.',
      data: { errors: parsed.error.flatten().fieldErrors }
    })
  return (
    await laravel(event, token).patch<ApiEnvelope<SubmittedRecipe>>(
      `admin/submitted-recipes/${id}/review`,
      parsed.data
    )
  ).data
})

import type { ApiEnvelope, SubmittedRecipe } from '#shared/types/api'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^[1-9]\d*$/.test(id)) throw createError({ statusCode: 404 })
  return (
    await laravel(event, token).get<ApiEnvelope<SubmittedRecipe>>(`admin/submitted-recipes/${id}`)
  ).data.data
})

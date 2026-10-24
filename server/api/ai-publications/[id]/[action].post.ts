import { aiActions, aiActionSchema } from '#shared/utils/aiPublications'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const action = getRouterParam(event, 'action')
  if (!aiActions.some(value => value === action)) throw createError({ statusCode: 404 })
  const payload = aiPayload(aiActionSchema, await readBody(event))
  if (action === 'reject' && !payload.note)
    throw createError({
      statusCode: 422,
      message: 'Ret nedenini yazın.',
      data: { errors: { note: ['Ret nedeni zorunlu.'] } }
    })
  const response = await laravel(event, token).post(
    'admin/ai-publications/' + aiId(event) + '/' + action,
    payload
  )
  return aiData(response.data)
})

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const response = await laravel(event, token).get('admin/ai-publications/' + aiId(event))
  return aiData(response.data)
})

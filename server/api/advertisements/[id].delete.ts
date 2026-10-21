export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  await laravel(event, token).delete(`admin/advertisements/${advertisementId(event)}`)
  return sendNoContent(event)
})

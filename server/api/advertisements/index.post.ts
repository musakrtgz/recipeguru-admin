export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const form = await advertisementForm(event, false)
  const response = await laravel(event, token).post('admin/advertisements', form, {
    maxBodyLength: 12 * 1024 * 1024
  })
  setResponseStatus(event, 201)
  return advertisementData(response.data)
})

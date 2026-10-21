export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const { token } = await requireAdmin(event)
  const id = advertisementId(event)
  const form = await advertisementForm(event, true)
  return advertisementData(
    (
      await laravel(event, token).post(`admin/advertisements/${id}`, form, {
        maxBodyLength: 12 * 1024 * 1024
      })
    ).data
  )
})

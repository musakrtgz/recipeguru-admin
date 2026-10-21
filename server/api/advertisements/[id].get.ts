export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  return advertisementData(
    (await laravel(event, token).get(`admin/advertisements/${advertisementId(event)}`)).data
  )
})

export default defineEventHandler(async (event) => {
  try {
    return { data: (await requireAdmin(event)).user }
  } catch (error) {
    if (isError(error) && [401, 403].includes(error.statusCode)) return { data: null }
    throw error
  }
})

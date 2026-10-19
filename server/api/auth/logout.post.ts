export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const session = await adminSession(event)
  const token = session.data.token
  try {
    if (token) await laravel(event, token).get('auth/logout')
  } finally {
    await session.clear()
  }
  return { data: null, message: 'Oturumunuz kapatıldı.' }
})

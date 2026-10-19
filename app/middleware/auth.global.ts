export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()
  try {
    // Her gezinmede sunucu gerçek rolü ve tokenı yeniden doğrular.
    const user = await auth.fetchSession()
    if (to.path === '/login') {
      if (user) return navigateTo('/')
    } else if (!user) return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  } catch {
    if (to.path !== '/login') return navigateTo({ path: '/login', query: { connection: 'failed' } })
  }
})

import type { AdminUser } from '#shared/types/api'

export function useAuth() {
  const user = useState<AdminUser | null>('admin-user', () => null)
  const api = useApi()
  async function fetchSession() {
    const response = await api.request<{ data: AdminUser | null }>(
      '/auth/session',
      {},
      { error: false }
    )
    user.value = response.data
    return user.value
  }
  async function login(email: string, password: string) {
    const response = await api.request<{ data: AdminUser }>(
      '/auth/login',
      { method: 'POST', data: { email, password } },
      { success: true, error: false }
    )
    user.value = response.data
  }
  async function logout() {
    try {
      await api.request('/auth/logout', { method: 'POST' }, { success: true })
    } finally {
      user.value = null
      clearNuxtData()
      await navigateTo('/login')
    }
  }
  return { user, fetchSession, login, logout }
}

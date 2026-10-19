import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import type { ApiFailure } from '#shared/types/api'

export function useApi() {
  const requestFetch = useRequestFetch()
  const toast = useToast()
  const user = useState('admin-user')
  const client = axios.create({
    baseURL: '/api',
    timeout: 25000,
    withCredentials: true
  })
  client.interceptors.response.use(
    response => response,
    (error: unknown) => {
      if (axios.isCancel(error)) return Promise.reject(error)
      const body = axios.isAxiosError(error) ? error.response?.data : undefined
      const failure: ApiFailure = {
        statusCode: axios.isAxiosError(error) ? (error.response?.status ?? 502) : 502,
        message:
          body?.message || body?.statusMessage || 'Bağlantı kurulamadı. Lütfen tekrar deneyin.',
        errors: body?.data?.errors ?? {}
      }
      return Promise.reject(failure)
    }
  )
  async function request<T>(
    path: string,
    config: AxiosRequestConfig = {},
    feedback: { success?: string | boolean, error?: boolean } = {}
  ): Promise<T> {
    try {
      let data: T
      if (import.meta.server) {
        if (config.method && config.method.toLowerCase() !== 'get')
          throw new Error('SSR veri yüklemeleri yalnızca okuma isteği gönderebilir.')
        // SSR iç isteklerinde Nuxt yalnız mevcut isteğin çerezini taşır.
        data = (await requestFetch(`/api${path}`, {
          query: config.params,
          signal: config.signal as AbortSignal | undefined
        })) as T
      } else {
        data = (await client.request<T>({ ...config, url: path })).data
      }
      if (import.meta.client && feedback.success) {
        const message = (data as { message?: string }).message
        toast.add({
          title:
            typeof feedback.success === 'string'
              ? feedback.success
              : message || 'İşlem tamamlandı.',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
      return data
    } catch (error) {
      if (axios.isCancel(error)) throw error
      const raw = error as ApiFailure & {
        status?: number
        data?: {
          message?: string
          data?: { errors?: Record<string, string[]> }
        }
      }
      const failure: ApiFailure = {
        statusCode: raw.statusCode || raw.status || 502,
        message: raw.data?.message || raw.message || 'Veriler yüklenemedi.',
        errors: raw.errors || raw.data?.data?.errors || {}
      }
      if (import.meta.client) {
        if (feedback.error !== false)
          toast.add({
            title: 'İşlem tamamlanamadı',
            description: failure.message,
            color: 'error',
            icon: 'i-lucide-circle-alert'
          })
        if ([401, 403].includes(failure.statusCode) && path !== '/auth/login') {
          user.value = null
          clearNuxtData()
          await navigateTo('/login')
        }
      }
      throw failure
    }
  }
  return { request }
}

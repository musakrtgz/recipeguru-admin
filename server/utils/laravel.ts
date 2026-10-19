import axios from 'axios'
import { Agent } from 'node:https'
import { readFileSync } from 'node:fs'
import type { H3Event } from 'h3'
import type { ApiEnvelope, ApiFailure } from '#shared/types/api'

export function apiError(error: unknown): ApiFailure {
  if (!axios.isAxiosError(error))
    return {
      statusCode: 502,
      message: 'Sunucudan beklenen yanıt alınamadı. Lütfen tekrar deneyin.',
      errors: {}
    }
  const status = error.response?.status ?? (error.code === 'ECONNABORTED' ? 504 : 502)
  const body = error.response?.data
  const errors: Record<string, string[]> = {}
  if (status === 422 && body?.errors && typeof body.errors === 'object') {
    for (const [key, value] of Object.entries(body.errors)) {
      if (Array.isArray(value))
        errors[key] = value.filter((item): item is string => typeof item === 'string').slice(0, 3)
    }
  }
  const fallback
    = status === 401
      ? 'Oturumunuz sona erdi. Lütfen yeniden giriş yapın.'
      : status === 403
        ? 'Bu alana erişim yetkiniz bulunmuyor.'
        : status === 429
          ? 'Çok fazla deneme yapıldı. Biraz bekleyip yeniden deneyin.'
          : status >= 500
            ? 'API bağlantısı kurulamadı. Lütfen tekrar deneyin.'
            : 'İşlem tamamlanamadı.'
  return {
    statusCode: status,
    message:
      status < 500 && typeof body?.message === 'string' ? body.message.slice(0, 300) : fallback,
    errors
  }
}
export function laravel(event: H3Event, token?: string) {
  const config = useRuntimeConfig(event)
  const baseURL = config.apiEnvironment === 'production' ? config.apiBaseProd : config.apiBaseDev
  if (!['development', 'production'].includes(config.apiEnvironment) || !baseURL)
    throw createError({
      statusCode: 503,
      message: 'API ortamı yapılandırılmamış.'
    })
  const url = new URL(baseURL)
  if (
    !['https:', 'http:'].includes(url.protocol)
    || (config.apiEnvironment === 'production' && url.protocol !== 'https:')
  )
    throw createError({
      statusCode: 503,
      message: 'API adresi güvenli HTTPS kullanmalı.'
    })
  const client = axios.create({
    baseURL: baseURL.replace(/\/$/, '') + '/',
    timeout: 20000,
    maxRedirects: 0,
    maxContentLength: 12 * 1024 * 1024,
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'tr',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(config.apiCaFile ? { httpsAgent: new Agent({ ca: readFileSync(config.apiCaFile) }) } : {})
  })
  client.interceptors.response.use(
    (response) => {
      if ((response.data as ApiEnvelope<unknown>)?.status === false) {
        throw createError({
          statusCode: 400,
          message: response.data.message || 'İşlem tamamlanamadı.',
          data: { errors: response.data.errors ?? {} }
        })
      }
      return response
    },
    (error: unknown) => {
      const failure = apiError(error)
      throw createError({
        statusCode: failure.statusCode,
        message: failure.message,
        data: { errors: failure.errors }
      })
    }
  )
  return client
}

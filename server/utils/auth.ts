import { useSession } from 'h3'
import type { H3Event } from 'h3'
import { adminConfig } from '#shared/config/admin'
import { toAdminUser, isSameOrigin } from '#shared/utils/contracts'
import type { AdminUser, ApiEnvelope } from '#shared/types/api'

export async function adminSession(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (config.sessionPassword.length < 32)
    throw createError({
      statusCode: 503,
      message: 'Oturum anahtarı yapılandırılmamış.'
    })
  const secure = new URL(config.siteUrl).protocol === 'https:'
  if (config.apiEnvironment === 'production' && !secure)
    throw createError({
      statusCode: 503,
      message: 'Canlı panel HTTPS üzerinden sunulmalı.'
    })
  return useSession<{ token?: string }>(event, {
    name: adminConfig.session.cookieName,
    password: config.sessionPassword,
    maxAge: adminConfig.session.maxAge,
    sessionHeader: false,
    cookie: { httpOnly: true, secure, sameSite: 'lax', path: '/' }
  })
}
export function requireSameOrigin(event: H3Event) {
  if (!isSameOrigin(getHeader(event, 'origin'), useRuntimeConfig(event).siteUrl)) {
    throw createError({
      statusCode: 403,
      message: 'İstek kaynağı doğrulanamadı. Sayfayı yenileyip tekrar deneyin.'
    })
  }
}
export async function requireAdmin(event: H3Event): Promise<{ user: AdminUser, token: string }> {
  if (event.context.adminIdentity) return event.context.adminIdentity
  const session = await adminSession(event)
  const token = session.data.token
  if (!token)
    throw createError({
      statusCode: 401,
      message: 'Devam etmek için giriş yapın.'
    })
  try {
    const response = await laravel(event, token).get<ApiEnvelope<unknown>>('me')
    let user: AdminUser
    try {
      user = toAdminUser(response.data.data)
    } catch {
      await session.clear()
      throw createError({
        statusCode: 403,
        message: 'Yalnızca aktif admin hesapları giriş yapabilir.'
      })
    }
    event.context.adminIdentity = { user, token }
    return { user, token }
  } catch (error) {
    if (isError(error) && [401, 403].includes(error.statusCode)) await session.clear()
    throw error
  }
}

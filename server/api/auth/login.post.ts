import { loginSchema, extractLogin } from '#shared/utils/contracts'
import type { ApiEnvelope } from '#shared/types/api'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const parsed = loginSchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({
      statusCode: 422,
      message: 'Giriş bilgilerinizi kontrol edin.',
      data: { errors: parsed.error.flatten().fieldErrors }
    })
  const session = await adminSession(event)
  const response = await laravel(event).post<ApiEnvelope<unknown>>('auth/login', parsed.data)
  try {
    const { user, token } = extractLogin(response.data)
    await session.clear()
    await session.update({ token })
    return { data: user, message: 'Hoş geldiniz. Güvenli oturumunuz açıldı.' }
  } catch {
    const raw = response.data.data as { access_token?: { token?: string } } | undefined
    if (raw?.access_token?.token) {
      try {
        await laravel(event, raw.access_token.token).get('auth/logout')
      } catch {
        /* Token hiçbir durumda panel oturumuna yazılmaz. */
      }
    }
    await session.clear()
    throw createError({
      statusCode: 403,
      message: 'Bu panele yalnızca admin yetkisine sahip hesaplar giriş yapabilir.'
    })
  }
})

import type { H3Event } from 'h3'
import type { ZodType } from 'zod'
import { toAiPublication } from '#shared/utils/aiPublications'

export function aiId(event: H3Event) {
  const id = getRouterParam(event, 'id')
  if (!id || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
    throw createError({ statusCode: 404 })
  return id
}
export function aiPayload<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success)
    throw createError({
      statusCode: 422,
      message: 'AI yayın bilgilerini kontrol edin.',
      data: { errors: parsed.error.flatten().fieldErrors }
    })
  return parsed.data
}
export function aiData(input: unknown) {
  try {
    return toAiPublication((input as { data: unknown }).data)
  } catch {
    throw createError({ statusCode: 502, message: 'AI yayın yanıtı beklenen biçimde dönmedi.' })
  }
}

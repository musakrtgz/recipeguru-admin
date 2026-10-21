import type { H3Event } from 'h3'
import { getRequestWebStream } from 'h3'
import { adSaveSchema, adImageError, advertisementSchema } from '#shared/utils/advertisements'

export function advertisementId(event: H3Event) {
  const id = getRouterParam(event, 'id')
  if (!id || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
    throw createError({ statusCode: 404 })
  return id
}
export function advertisementData(input: unknown) {
  const value = input as { data?: unknown }
  const parsed = advertisementSchema.safeParse(value?.data)
  if (!parsed.success)
    throw createError({ statusCode: 502, message: 'Reklam yanıtı beklenen biçimde dönmedi.' })
  return parsed.data
}
export async function advertisementForm(event: H3Event, updating: boolean) {
  const type = getHeader(event, 'content-type') || ''
  if (!type.startsWith('multipart/form-data;') || type.length > 250)
    throw createError({
      statusCode: 415,
      message: 'Görsel ve reklam bilgilerini form olarak gönderin.'
    })
  const limit = 11 * 1024 * 1024
  if (Number(getHeader(event, 'content-length')) > limit)
    throw createError({ statusCode: 413, message: 'Yükleme en fazla 11 MB olabilir.' })
  const stream = getRequestWebStream(event)
  if (!stream) throw createError({ statusCode: 400, message: 'Yüklenecek form bulunamadı.' })
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    size += chunk.value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw createError({ statusCode: 413, message: 'Yükleme en fazla 11 MB olabilir.' })
    }
    chunks.push(chunk.value)
  }
  const bytes = new Uint8Array(size)
  let position = 0
  for (const chunk of chunks) {
    bytes.set(chunk, position)
    position += chunk.byteLength
  }
  let form: FormData
  try {
    form = await new Response(bytes, { headers: { 'Content-Type': type } }).formData()
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Yükleme okunamadı. Görseli yeniden seçip deneyin.'
    })
  }
  const fields: Record<string, string> = Object.create(null)
  let image: File | null = null
  for (const [key, value] of form) {
    if (key === 'image' && typeof value !== 'string' && image === null) image = value
    else if (typeof value === 'string' && !Object.hasOwn(fields, key) && key !== 'image')
      fields[key] = value
    else throw createError({ statusCode: 422, message: 'Tekrarlanan veya geçersiz form alanı.' })
  }
  const parsed = adSaveSchema.safeParse(fields)
  const imageError = adImageError(image, !updating)
  const expectedRevision = Number(fields.expected_revision)
  const revisionError = updating
    ? !Number.isSafeInteger(expectedRevision) || expectedRevision < 1
    : Object.hasOwn(fields, 'expected_revision')
  if (!parsed.success || imageError || revisionError)
    throw createError({
      statusCode: 422,
      message: 'Reklam bilgilerini kontrol edin.',
      data: {
        errors: {
          ...(!parsed.success ? parsed.error.flatten().fieldErrors : {}),
          ...(imageError ? { image: [imageError] } : {}),
          ...(revisionError ? { expected_revision: ['Güncel reklamı açıp tekrar deneyin.'] } : {})
        }
      }
    })
  const payload = new FormData()
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined)
      payload.set(
        key,
        value === null ? '' : typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
      )
  }
  if (image)
    payload.set(
      'image',
      image,
      'advertisement.' + (image.type === 'image/jpeg' ? 'jpg' : image.type.split('/')[1])
    )
  if (updating) payload.set('_method', 'PUT')
  return payload
}

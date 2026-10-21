import { Buffer } from 'node:buffer'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const id = advertisementId(event)
  const image = getRouterParam(event, 'image')
  if (!image || !/^[a-f0-9-]{36}$/i.test(image)) throw createError({ statusCode: 404 })
  const response = await laravel(event, token).get(`advertisements/${id}/images/${image}`, {
    responseType: 'arraybuffer'
  })
  const type = String(response.headers['content-type']).split(';')[0]
  if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type))
    throw createError({ statusCode: 415 })
  setHeader(event, 'Content-Type', type)
  return Buffer.from(response.data)
})

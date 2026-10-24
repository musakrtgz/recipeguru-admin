import { Buffer } from 'node:buffer'

export default defineEventHandler(async (event) => {
  const { token } = await requireAdmin(event)
  const response = await laravel(event, token).get(
    'admin/ai-publications/' + aiId(event) + '/cover',
    { responseType: 'arraybuffer' }
  )
  if (String(response.headers['content-type']).split(';')[0] !== 'image/png')
    throw createError({ statusCode: 415 })
  setHeader(event, 'Content-Type', 'image/png')
  return Buffer.from(response.data)
})

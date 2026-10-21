import { describe, expect, it } from 'vitest'
import {
  adSaveSchema,
  adImageError,
  adReportQuerySchema,
  adToggleSchema,
  adSettingsSchema,
  adQuerySchema,
  httpUrl,
  isoDateTime,
  localDateTime,
  maxAdImageSize,
  toAdvertisementPage
} from '../shared/utils/advertisements'

const values = {
  title: 'Kampanya',
  sponsor_name: 'Sponsor',
  body: '',
  cta_label: '',
  destination_type: 'external',
  destination_id: '',
  external_url: 'https://example.test/ad',
  locale: 'all',
  is_active: '0',
  starts_at: '2026-10-19T12:00:00Z',
  ends_at: '2026-10-20T12:00:00Z',
  weight: '1',
  daily_user_cap: '3',
  max_impressions: ''
}
describe('Reklam yönetimi sözleşmeleri', () => {
  it('form alanlarını ve isteğe bağlı değerleri API biçimine çevirir', () => {
    expect(adSaveSchema.parse(values)).toMatchObject({
      is_active: false,
      weight: 1,
      daily_user_cap: 3,
      max_impressions: null,
      locale: null,
      destination_id: null
    })
  })
  it.each([
    'javascript:alert(1)',
    'ftp://example.test',
    'https://user:password@example.test',
    '//example.test'
  ])('güvensiz URL engellenir: %s', (url) => {
    expect(httpUrl.safeParse(url).success).toBe(false)
  })
  it.each([
    { destination_type: 'recipe' },
    { destination_type: 'submitted_recipe', destination_id: 1 },
    { destination_id: 2 },
    { ends_at: values.starts_at },
    { daily_user_cap: 101 },
    { weight: 0 },
    { max_impressions: -1 },
    { title: '' },
    { impressions_count: 999 },
    { image_path: '/private/file' }
  ])('geçersiz kampanya engellenir: %o', (change) => {
    expect(adSaveSchema.safeParse({ ...values, ...change }).success).toBe(false)
  })
  it('tarif hedefinde harici bağlantı olmadan kimliği zorunlu tutar', () => {
    expect(
      adSaveSchema.safeParse({
        ...values,
        destination_type: 'recipe',
        destination_id: '126',
        external_url: ''
      }).success
    ).toBe(true)
  })
  it('görsel boyutu ve türünü denetler', () => {
    expect(adImageError(null, true)).toBeTruthy()
    expect(adImageError({ size: 10, type: 'image/svg+xml' })).toBeTruthy()
    expect(adImageError({ size: maxAdImageSize + 1, type: 'image/png' })).toBeTruthy()
    expect(adImageError({ size: 100, type: 'image/jpeg' })).toBe('')
  })
  it('366 günlük rapor sınırı ve ters tarih aralığını denetler', () => {
    expect(adReportQuerySchema.safeParse({ from: '2026-01-01', to: '2027-01-01' }).success).toBe(
      true
    )
    expect(adReportQuerySchema.safeParse({ from: '2026-01-01', to: '2027-01-02' }).success).toBe(
      false
    )
    expect(adReportQuerySchema.safeParse({ from: '2026-10-20', to: '2026-10-19' }).success).toBe(
      false
    )
  })
  it('yayın ayarları ve durum değişiminde sayaç yazılmasını engeller', () => {
    expect(adToggleSchema.safeParse({ is_active: true, expected_revision: 0 }).success).toBe(false)
    expect(
      adToggleSchema.safeParse({ is_active: true, expected_revision: 1, clicks_count: 1 }).success
    ).toBe(false)
    expect(adSettingsSchema.safeParse({ enabled: true, organic_interval: 51 }).success).toBe(false)
    expect(adQuerySchema.safeParse({ status: 'deleted' }).success).toBe(false)
  })
  it('yerel saat ve ISO dönüşümünde zamanı korur', () => {
    const date = '2026-10-19T12:35:17Z'
    expect(Date.parse(isoDateTime(localDateTime(date)))).toBe(Date.parse(date))
    expect(isoDateTime('invalid')).toBe('')
  })
  it('hatalı liste yanıtını boş kampanya saymaz', () => {
    expect(() => toAdvertisementPage({ data: [] })).toThrow()
  })
})

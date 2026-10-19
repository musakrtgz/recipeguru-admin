import { describe, expect, it } from 'vitest'
import {
  catalogQuerySchema,
  catalogUrlQuery,
  personRange,
  toCatalogLanguages,
  toCatalogDetail,
  recipeSections,
  toCatalogPage
} from '../shared/utils/catalog'

describe('Tarif listesi sözleşmesi', () => {
  it('varsayılan filtre ve sayfalama değerlerini korur', () => {
    expect(catalogQuerySchema.parse({})).toEqual({
      q: '',
      locale: 'all',
      sort: '-id',
      page: 1,
      per_page: 10
    })
  })
  it.each([
    { per_page: 1000 },
    { page: -1 },
    { sort: 'password' },
    { locale: '../../etc' },
    { q: 'x'.repeat(151) }
  ])('geçersiz sorguyu reddeder: %j', (query) => {
    expect(catalogQuerySchema.safeParse(query).success).toBe(false)
  })
  it('boş filtreleri URL dışına çıkarır, geçerli filtreleri saklar', () => {
    expect(
      catalogUrlQuery(
        catalogQuerySchema.parse({ q: '  Çorba  ', locale: 'tr', page: '2', per_page: '25' })
      )
    ).toEqual({ q: 'Çorba', locale: 'tr', page: '2', per_page: '25' })
    expect(catalogUrlQuery(catalogQuerySchema.parse({}))).toEqual({})
  })
  it('eksik çeviriyi ve sıfır süreyi kaybetmez, özel alanları taşımaz', () => {
    const result = toCatalogPage({
      data: [{ id: 1, translation: null, cooking_time: 0, calories: '120.5', provider: 'secret' }],
      meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 }
    })
    expect(result.items[0]).toMatchObject({ title: null, cookingTime: 0, calories: 120.5 })
    expect(JSON.stringify(result)).not.toContain('provider')
  })
  it('hatalı metaveriyi boş liste gibi göstermez', () => {
    expect(() => toCatalogPage({ data: [], meta: { total: 'unknown' } })).toThrow()
  })
  it('dil adlarını gerçek API seçeneklerinden okur', () => {
    expect(
      toCatalogLanguages({ data: [{ code: 'tr', name: 'Turkish', local_name: 'Türkçe' }] })
    ).toEqual([{ code: 'tr', name: 'Türkçe' }])
  })
  it('porsiyon aralığını ve eksik değerleri doğru gösterir', () => {
    expect(personRange(2, 4)).toBe('2–4 kişilik')
    expect(personRange(2, 2)).toBe('2 kişilik')
    expect(personRange(null, null)).toBe('—')
  })
})

describe('Tarif detayı sözleşmesi', () => {
  const detail = {
    id: 1,
    title: 'Çorba',
    locale: 'tr',
    min_person: 2,
    max_person: 4,
    cooking_time: 20,
    calories: 240,
    cooker: 'Ocak',
    repast: null,
    image_url: 'javascript:alert(1)',
    created_at: '2026-10-19T10:00:00Z',
    recipe: ['Birinci adım', 'İkinci adım'],
    tips: ['Sıcak servis edin.'],
    ingredients: [{ name: 'Mercimek', amount: '2', measurement: 'bardak' }],
    provider: 'private'
  }
  it('tarif, malzeme ve püf noktalarını kayıpsız gösterir', () => {
    const result = toCatalogDetail(detail)
    expect(result.ingredients).toEqual(['2 bardak Mercimek'])
    expect(result.sections[0]?.items).toEqual(['Birinci adım', 'İkinci adım'])
    expect(result.tips).toEqual(['Sıcak servis edin.'])
    expect(JSON.stringify(result)).not.toContain('provider')
  })
  it('tehlikeli veya kimlik bilgisi içeren görsel URL kullanmaz', () => {
    expect(toCatalogDetail(detail).imageUrl).toBeNull()
    expect(
      toCatalogDetail({ ...detail, image_url: 'https://user:password@example.com/image.jpg' })
        .imageUrl
    ).toBeNull()
    expect(
      toCatalogDetail({ ...detail, image_url: 'https://example.com/image.jpg' }).imageUrl
    ).toBe('https://example.com/image.jpg')
  })
  it('eski metin ve başlık gruplu tarifleri de korur', () => {
    expect(recipeSections('Eski hazırlanış metni')[0]?.items).toEqual(['Eski hazırlanış metni'])
    expect(recipeSections({ Sos: ['Karıştırın.'], steps: ['Pişirin.'] })).toEqual([
      { title: 'Sos', items: ['Karıştırın.'] },
      { title: 'Hazırlanışı', items: ['Pişirin.'] }
    ])
  })
})

it('kullanıcıya ait pişirme yöntemi ve öğün adlarını da gösterir', () => {
  const result = toCatalogPage({
    data: [
      {
        id: 1,
        translation: null,
        cookerable: { name: 'Airfryer' },
        repastable: { name: 'Ara öğün' }
      }
    ],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 }
  })
  expect(result.items[0]).toMatchObject({ cooker: 'Airfryer', repast: 'Ara öğün' })
})

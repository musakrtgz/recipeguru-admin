import { describe, expect, it } from 'vitest'
import {
  extractLogin,
  isSameOrigin,
  loginSchema,
  periodSchema,
  recipeQuerySchema,
  reviewSchema,
  safeRedirect,
  toAdminUser,
  toRecipePage
} from '../shared/utils/contracts'

const user = {
  id: 7,
  name: 'Test',
  surname: 'Yönetici',
  email: 'admin@example.test',
  role: 'admin',
  is_active: true,
  is_blocked: false
}

describe('Admin kimliği ve form kuralları', () => {
  it('yalnız aktif ve engellenmemiş admin kabul eder', () => {
    expect(toAdminUser(user).role).toBe('admin')
    for (const change of [
      { role: 'user' },
      { is_active: false },
      { is_blocked: true },
      { role: null }
    ])
      expect(() => toAdminUser({ ...user, ...change })).toThrow()
  })
  it('oturum yanıtına token veya diğer kullanıcı alanlarını taşımaz', () => {
    expect(toAdminUser({ ...user, access_token: 'secret' })).toEqual({
      id: 7,
      name: 'Test',
      surname: 'Yönetici',
      email: 'admin@example.test',
      role: 'admin'
    })
  })
  it('gerçek Laravel token sözleşmesini okur', () => {
    expect(
      extractLogin({ data: { ...user, access_token: { token: '7|test-token-long' } } }).token
    ).toBe('7|test-token-long')
    expect(() => extractLogin({ data: user })).toThrow()
  })
  it('eksik veya geçersiz giriş verisini engeller', () => {
    expect(loginSchema.safeParse({ email: 'yanlis', password: '' }).success).toBe(false)
    expect(
      loginSchema.safeParse({ email: 'admin@example.test', password: 'a'.repeat(1025) }).success
    ).toBe(false)
  })
  it('reddetme gerekçesini ve güncel revision alanını zorunlu tutar', () => {
    expect(
      reviewSchema.safeParse({ status: 'rejected', revision: 1, review_note: '  ' }).success
    ).toBe(false)
    expect(reviewSchema.safeParse({ status: 'approved', revision: 0 }).success).toBe(false)
    expect(reviewSchema.safeParse({ status: 'approved', revision: 1 }).success).toBe(true)
  })
  it('sorgu ve tarih aralığını sınırlar', () => {
    expect(recipeQuerySchema.safeParse({ page: '-1' }).success).toBe(false)
    expect(recipeQuerySchema.safeParse({ status: 'deleted' }).success).toBe(false)
    expect(periodSchema.safeParse('100000').success).toBe(false)
    expect(recipeQuerySchema.parse({}).page).toBe(1)
  })
  it('hatalı sayfalama yanıtını sıfır kayıt gibi göstermez', () => {
    expect(() => toRecipePage({ data: [] })).toThrow()
  })
})
describe('İstek güvenliği', () => {
  it.each([undefined, 'null', 'https://evil.example', 'http://localhost:3001'])(
    'yabancı veya eksik origin reddedilir: %s',
    (origin) => {
      expect(isSameOrigin(origin, 'http://localhost:3000')).toBe(false)
    }
  )
  it('yalnız aynı origin kabul edilir', () => {
    expect(isSameOrigin('https://admin.recipeguru.app', 'https://admin.recipeguru.app')).toBe(true)
  })
  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/login',
    '/%2f%2fevil.example'
  ])('güvensiz dönüş adresi köke gider: %s', (path) => {
    expect(safeRedirect(path)).toBe('/')
  })
  it('yerel sayfaya dönüşü korur', () => {
    expect(safeRedirect('/recipes?page=2')).toBe('/recipes?page=2')
  })
})

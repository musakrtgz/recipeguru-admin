import { describe, expect, it } from 'vitest'
import { recipeEditSchema, recipeEditErrors } from '../shared/utils/recipeReview'
import { reviewSchema } from '../shared/utils/contracts'

const attributes = {
  revision: 2,
  title: 'Makarna',
  person_count: '4',
  cooking_time: '30',
  tips: null,
  ingredients: ['2 domates'],
  preparation: 'Domatesleri doğrayıp pişirin.'
}
describe('Tarif düzenleme ve yeniden inceleme sözleşmesi', () => {
  it('üç yayın durumuna geçişi ve zorunlu ret notunu doğrular', () => {
    for (const status of ['pending', 'approved', 'rejected']) {
      expect(
        reviewSchema.safeParse({ status, revision: 2, review_note: 'İnceleme notu' }).success
      ).toBe(true)
    }
    expect(
      reviewSchema.safeParse({ status: 'rejected', revision: 2, review_note: ' ' }).success
    ).toBe(false)
  })
  it('yapısal metinleri kırpar ve sayısal alanları dönüştürür', () => {
    expect(
      recipeEditSchema.parse({ ...attributes, title: ' Makarna ', ingredients: [' 2 domates '] })
    ).toMatchObject({
      title: 'Makarna',
      person_count: 4,
      cooking_time: 30,
      ingredients: ['2 domates']
    })
  })
  it.each([
    { ingredients: [] },
    { ingredients: [''] },
    { ingredients: ['iki\nsatır'] },
    { preparation: 'Kısa' },
    { person_count: '' },
    { cooking_time: 0 },
    { revision: 0 }
  ])('eksik tarif alanını engeller: %o', (change) => {
    expect(recipeEditSchema.safeParse({ ...attributes, ...change }).success).toBe(false)
  })
  it('formdaki hatayı ilgili alanla eşleştirir', () => {
    expect(recipeEditErrors({ ...attributes, ingredients: [''] }).ingredients).toBeDefined()
    expect(recipeEditErrors({ ...attributes, title: '' }).title).toBeDefined()
  })
  it('eski serbest metni korur ve medya/sahiplik/durum enjeksiyonunu engeller', () => {
    const { ingredients: _ingredients, preparation: _preparation, ...legacy } = attributes
    expect(recipeEditSchema.parse({ ...legacy, content: 'Eski malzemeler ve tarif hazırlanışı.' })).toMatchObject({ content: 'Eski malzemeler ve tarif hazırlanışı.' })
    for (const change of [
      { user_id: 9 },
      { locale: 'en' },
      { status: 'approved' },
      { gallery: [] },
      { cover_image: null }
    ]) {
      expect(recipeEditSchema.safeParse({ ...attributes, ...change }).success).toBe(false)
    }
  })
})

import { z } from 'zod'
import type { RecipeStatus } from '../types/api'

export const recipeStatuses: { label: string, value: RecipeStatus }[] = [
  { label: 'İncelemede', value: 'pending' },
  { label: 'Yayında', value: 'approved' },
  { label: 'Reddedildi', value: 'rejected' }
]
export function recipeStatusLabel(status: RecipeStatus) {
  return recipeStatuses.find(item => item.value === status)?.label || status
}
const fields = {
  revision: z.number().int().positive(),
  title: z.string().trim().min(2, 'Tarif adı en az 2 karakter olmalı.').max(200),
  person_count: z.coerce.number().int().min(1, 'Kaç kişilik olduğunu yazın.').max(100),
  cooking_time: z.coerce.number().int().min(1, 'Pişirme süresini dakika olarak yazın.').max(1440),
  tips: z.string().trim().max(5000).nullable()
}
const ingredient = z
  .string()
  .trim()
  .min(1, 'Boş malzemeyi doldurun veya kaldırın.')
  .max(200)
  .regex(/^[^\r\n]*$/, 'Her malzemeyi ayrı satıra ekleyin.')
export const recipeEditSchema = z.union([
  z.strictObject({
    ...fields,
    ingredients: z.array(ingredient).min(1, 'En az bir malzeme ekleyin.').max(100),
    preparation: z.string().trim().min(10, 'Hazırlanışı en az 10 karakterle açıklayın.').max(20000)
  }),
  z.strictObject({
    ...fields,
    content: z.string().trim().min(10, 'Tarif metni en az 10 karakter olmalı.').max(20000)
  })
])
export type RecipeEdit = z.output<typeof recipeEditSchema>
export interface RecipeEditDraft {
  title: string
  person_count: string
  cooking_time: string
  tips: string
  ingredients: string[]
  preparation: string
  content: string
}
export function recipeEditErrors(input: unknown): Record<string, string[]> {
  // Validate the matching form directly so field messages survive union errors.
  const shape = input && typeof input === 'object' && 'ingredients' in input ? 0 : 1
  const result = recipeEditSchema.options[shape].safeParse(input)
  return result.success ? {} : result.error.flatten().fieldErrors
}

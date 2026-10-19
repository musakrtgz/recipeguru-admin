import { z } from 'zod'
import type { ApiEnvelope } from '../types/api'
import type {
  CatalogDetail,
  CatalogLanguage,
  CatalogPage,
  CatalogQuery,
  RecipeContentSection
} from '../types/catalog'

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(150).default(''),
  locale: z
    .string()
    .regex(/^(all|[a-z]{2}(?:-[A-Z]{2})?)$/)
    .default('all'),
  sort: z
    .enum(['id', '-id', 'created_at', '-created_at', 'cooking_time', '-cooking_time'])
    .default('-id'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  per_page: z.coerce
    .number()
    .int()
    .refine(value => [10, 25, 50].includes(value))
    .default(10)
})
const nullableNumber = z
  .union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/)])
  .transform(Number)
  .nullable()
  .optional()
const translation = z
  .object({ title: z.string().nullable().optional(), locale: z.string().optional() })
  .nullable()
  .optional()
const relation = z
  .object({
    name: z.string().nullable().optional(),
    translation: z.object({ name: z.string().optional() }).nullable().optional()
  })
  .nullable()
  .optional()
const item = z.object({
  id: z.number().int().positive(),
  translation,
  min_person: nullableNumber,
  max_person: nullableNumber,
  cooking_time: nullableNumber,
  calories: nullableNumber,
  cookerable: relation,
  repastable: relation,
  created_at: z.string().nullable().optional()
})
export function toCatalogPage(input: unknown): CatalogPage {
  const response = z
    .object({
      data: z.array(item),
      meta: z.object({
        current_page: z.number().int().positive(),
        last_page: z.number().int().positive(),
        total: z.number().int().nonnegative(),
        per_page: z.number().int().positive()
      })
    })
    .parse(input)
  return {
    items: response.data.map(recipe => ({
      id: recipe.id,
      title: recipe.translation?.title || null,
      locale: recipe.translation?.locale || null,
      minPerson: recipe.min_person ?? null,
      maxPerson: recipe.max_person ?? null,
      cookingTime: recipe.cooking_time ?? null,
      calories: recipe.calories ?? null,
      cooker: recipe.cookerable?.translation?.name || recipe.cookerable?.name || null,
      repast: recipe.repastable?.translation?.name || recipe.repastable?.name || null,
      createdAt: recipe.created_at || null
    })),
    page: response.meta.current_page,
    lastPage: response.meta.last_page,
    total: response.meta.total,
    pageSize: response.meta.per_page
  }
}
export function toCatalogLanguages(input: ApiEnvelope<unknown>): CatalogLanguage[] {
  return z
    .array(
      z.object({ code: z.string(), name: z.string(), local_name: z.string().nullable().optional() })
    )
    .parse(input.data)
    .map(language => ({ code: language.code, name: language.local_name || language.name }))
}
export function catalogUrlQuery(query: CatalogQuery): Record<string, string> {
  return {
    ...(query.q ? { q: query.q } : {}),
    ...(query.locale !== 'all' ? { locale: query.locale } : {}),
    ...(query.sort !== '-id' ? { sort: query.sort } : {}),
    ...(query.page > 1 ? { page: String(query.page) } : {}),
    ...(query.per_page !== 10 ? { per_page: String(query.per_page) } : {})
  }
}
export function personRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—'
  return min !== null && max !== null && min !== max
    ? `${min}–${max} kişilik`
    : `${max ?? min} kişilik`
}

export function recipeTextLines(value: unknown, depth = 0): string[] {
  if (depth > 8) return ['Bu bölümün içerik biçimi görüntülenemiyor.']
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(item => recipeTextLines(item, depth + 1))
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([key, item]) =>
      recipeTextLines(item, depth + 1).map(line => key + ': ' + line)
    )
  return []
}
export function recipeSections(value: unknown): RecipeContentSection[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value)
      .map(([key, item]) => ({
        title: /^(steps|directions|instructions|preparation|hazırlanışı|tarif)$/i.test(key)
          ? 'Hazırlanışı'
          : key,
        items: recipeTextLines(item)
      }))
      .filter(section => section.items.length > 0)
  }
  const lines = recipeTextLines(value)
  return lines.length ? [{ title: 'Hazırlanışı', items: lines }] : []
}
export function toCatalogDetail(input: unknown): CatalogDetail {
  const data = z
    .object({
      id: z.number().int().positive(),
      title: z.string().nullable(),
      locale: z.string().nullable(),
      min_person: nullableNumber,
      max_person: nullableNumber,
      cooking_time: nullableNumber,
      calories: nullableNumber,
      cooker: z.string().nullable(),
      repast: z.string().nullable(),
      image_url: z.string().nullable(),
      created_at: z.string().nullable(),
      recipe: z.unknown(),
      tips: z.unknown(),
      ingredients: z.array(
        z.object({
          name: z.string().nullable(),
          amount: z.union([z.string(), z.number()]).nullable(),
          measurement: z.string().nullable()
        })
      )
    })
    .parse(input)
  let imageUrl: string | null = null
  if (data.image_url) {
    try {
      const url = new URL(data.image_url)
      if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password)
        imageUrl = url.href
    } catch {
      /* Geçersiz kapak URL'si görsel olarak yüklenmez. */
    }
  }
  return {
    id: data.id,
    title: data.title,
    locale: data.locale,
    minPerson: data.min_person ?? null,
    maxPerson: data.max_person ?? null,
    cookingTime: data.cooking_time ?? null,
    calories: data.calories ?? null,
    cooker: data.cooker,
    repast: data.repast,
    imageUrl,
    createdAt: data.created_at,
    ingredients: data.ingredients.map(item =>
      [item.amount, item.measurement, item.name || 'Malzeme bilgisi bulunamadı']
        .filter(item => item !== null && item !== '')
        .join(' ')
    ),
    sections: recipeSections(data.recipe),
    tips: recipeTextLines(data.tips)
  }
}

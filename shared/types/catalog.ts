export interface CatalogQuery {
  q: string
  locale: string
  sort: 'id' | '-id' | 'created_at' | '-created_at' | 'cooking_time' | '-cooking_time'
  page: number
  per_page: number
}
export interface CatalogRecipe {
  id: number
  title: string | null
  locale: string | null
  minPerson: number | null
  maxPerson: number | null
  cookingTime: number | null
  calories: number | null
  cooker: string | null
  repast: string | null
  createdAt: string | null
}
export interface CatalogPage {
  items: CatalogRecipe[]
  page: number
  lastPage: number
  total: number
  pageSize: number
}
export interface CatalogLanguage {
  code: string
  name: string
}

export interface RecipeContentSection {
  title: string
  items: string[]
}
export interface CatalogDetail extends CatalogRecipe {
  imageUrl: string | null
  ingredients: string[]
  sections: RecipeContentSection[]
  tips: string[]
}

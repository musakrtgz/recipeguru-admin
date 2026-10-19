export interface ApiEnvelope<T> {
  status?: boolean
  message?: string
  data: T
  errors?: Record<string, string[]>
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
export interface AdminUser {
  id: number
  name: string
  surname: string | null
  email: string
  role: 'admin'
}
export interface ApiFailure {
  statusCode: number
  message: string
  errors: Record<string, string[]>
}
export interface DashboardStats {
  total_users_count: number
  total_deleted_users_count: number
  total_has_recipe_users_count: number
  total_not_has_collections_count: number
  total_recipes_count: number
  total_collections_count: number
  total_payment_amount_try: number
  total_payment_amount_usd: number
  payment_trial_count: number
  payment_normal_start_count: number
}
export type RecipeStatus = 'pending' | 'approved' | 'rejected'
export interface SubmittedRecipe {
  id: number
  title: string
  content: string | null
  ingredients: string[] | null
  preparation: string | null
  tips: string | null
  locale: string
  person_count: number
  cooking_time: number | null
  status: RecipeStatus
  revision: number
  submitted_at: string
  review_note: string | null
  reviewed_at: string | null
  review_source: 'admin' | 'ai' | null
  reviewed_by: number | null
  gallery: { id: string, url: string }[]
  cover_image: { id: string, url: string } | null
  author: {
    id: number
    name: string
    surname: string | null
    username: string | null
  } | null
}
export interface RecipePage {
  items: SubmittedRecipe[]
  page: number
  lastPage: number
  total: number
}
export interface RemoteSection<T> {
  data: T | null
  error: string | null
}
export interface DashboardData {
  stats: RemoteSection<DashboardStats>
  reviews: RemoteSection<RecipePage>
  distribution: RemoteSection<Record<RecipeStatus, number>>
  updatedAt: string
}

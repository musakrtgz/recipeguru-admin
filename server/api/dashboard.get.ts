import type {
  ApiEnvelope,
  DashboardData,
  DashboardStats,
  RecipePage,
  RecipeStatus,
  RemoteSection,
  SubmittedRecipe
} from '#shared/types/api'
import { periodSchema, toRecipePage } from '#shared/utils/contracts'

export default defineEventHandler(async (event): Promise<DashboardData> => {
  const { token } = await requireAdmin(event)
  const parsed = periodSchema.safeParse(getQuery(event).period)
  if (!parsed.success) throw createError({ statusCode: 422, message: 'Geçersiz tarih aralığı.' })
  const client = laravel(event, token)
  async function section<T>(request: () => Promise<T>): Promise<RemoteSection<T>> {
    try {
      return { data: await request(), error: null }
    } catch (error) {
      if (isError(error) && [401, 403].includes(error.statusCode)) throw error
      return {
        data: null,
        error: isError(error) ? error.message : 'Veriler yüklenemedi.'
      }
    }
  }
  const [stats, reviews, distribution] = await Promise.all([
    section<DashboardStats>(async () => {
      const response = await client.get<ApiEnvelope<DashboardStats>>('admin/stats/dashboard', {
        params: parsed.data === 'all' ? {} : { day: parsed.data }
      })
      const data = response.data.data
      if (
        !data
        || !Number.isFinite(data.total_users_count)
        || !Number.isFinite(data.total_recipes_count)
      )
        throw new Error('İstatistik yanıtı geçersiz.')
      return data
    }),
    section<RecipePage>(async () =>
      toRecipePage(
        (
          await client.get<ApiEnvelope<SubmittedRecipe[]>>('admin/submitted-recipes', {
            params: {
              'filter[status]': 'pending',
              'per_page': 5,
              'sort': '-submitted_at'
            }
          })
        ).data
      )
    ),
    section<Record<RecipeStatus, number>>(async () => {
      const statuses: RecipeStatus[] = ['pending', 'approved', 'rejected']
      const counts = await Promise.all(
        statuses.map(async (status) => {
          const response = await client.get<ApiEnvelope<SubmittedRecipe[]>>(
            'admin/submitted-recipes',
            { params: { 'filter[status]': status, 'per_page': 1 } }
          )
          return toRecipePage(response.data).total
        })
      )
      return { pending: counts[0]!, approved: counts[1]!, rejected: counts[2]! }
    })
  ])
  return { stats, reviews, distribution, updatedAt: new Date().toISOString() }
})

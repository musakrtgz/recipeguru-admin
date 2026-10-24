import type { AiProfile, AiSettings, toAiPage } from '#shared/utils/aiPublications'
import { aiQuerySchema } from '#shared/utils/aiPublications'

export function useAiPublications() {
  const api = useApi()
  const route = useRoute()
  const router = useRouter()
  const query = computed(() => {
    const value = aiQuerySchema.safeParse(route.query)
    return value.success ? value.data : aiQuerySchema.parse({})
  })
  const key = computed(() => 'ai-publications:' + JSON.stringify(query.value))
  const list = useAsyncData(key, (_, { signal }) =>
    api.request<ReturnType<typeof toAiPage>>(
      '/ai-publications',
      { params: query.value, signal },
      { error: false }
    )
  )
  const settings = useAsyncData('ai-publication-settings', () =>
    api.request<AiSettings>('/ai-publications/settings', {}, { error: false })
  )
  const profiles = useAsyncData('ai-publication-profiles', () =>
    api.request<AiProfile[]>('/ai-publications/profiles', {}, { error: false })
  )
  async function change(patch: Partial<typeof query.value>) {
    const value = aiQuerySchema.parse({ ...query.value, ...patch })
    await router.replace({
      query: {
        ...(value.status !== 'all' ? { status: value.status } : {}),
        ...(value.user_id ? { user_id: value.user_id } : {}),
        ...(value.page > 1 ? { page: value.page } : {}),
        ...(value.per_page !== 10 ? { per_page: value.per_page } : {})
      }
    })
  }
  const filter = computed({
    get: () => query.value.status,
    set: (value) => {
      void change({ status: value, page: 1 })
    }
  })
  const publisher = computed({
    get: () => (query.value.user_id ? String(query.value.user_id) : 'all'),
    set: (value) => {
      void change({ user_id: value === 'all' ? undefined : Number(value), page: 1 })
    }
  })
  const page = computed({
    get: () => query.value.page,
    set: (value) => {
      void change({ page: value })
    }
  })
  const pageSize = computed({
    get: () => query.value.per_page,
    set: (value) => {
      void change({ per_page: value, page: 1 })
    }
  })
  async function refresh() {
    await Promise.all([list.refresh(), settings.refresh(), profiles.refresh()])
  }
  return { query, list, settings, profiles, filter, publisher, page, pageSize, refresh }
}

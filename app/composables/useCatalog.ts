import { catalogQuerySchema, catalogUrlQuery } from '#shared/utils/catalog'
import type { CatalogLanguage, CatalogPage, CatalogQuery } from '#shared/types/catalog'

export function useCatalog() {
  const route = useRoute()
  const router = useRouter()
  const api = useApi()
  const query = computed<CatalogQuery>(() => {
    const parsed = catalogQuerySchema.safeParse(route.query)
    return parsed.success ? parsed.data : catalogQuerySchema.parse({})
  })
  const search = ref(query.value.q)
  watch(
    () => query.value.q,
    (value) => {
      search.value = value
    }
  )
  const key = computed(() => 'catalog:' + JSON.stringify(query.value))
  const list = useAsyncData(key, (_, { signal }) =>
    api.request<CatalogPage>('/catalog', { params: query.value, signal }, { error: false })
  )
  const languages = useAsyncData('catalog-languages', () =>
    api.request<CatalogLanguage[]>('/catalog/languages', {}, { error: false })
  )
  async function change(patch: Partial<CatalogQuery>) {
    const next = catalogQuerySchema.parse({ ...query.value, ...patch })
    await router.replace({ query: catalogUrlQuery(next) })
  }
  async function submitSearch() {
    await change({ q: search.value.trim(), page: 1 })
  }
  async function reset() {
    search.value = ''
    await router.replace({ query: {} })
  }
  const locale = computed({
    get: () => query.value.locale,
    set: (value) => {
      void change({ locale: value, page: 1 })
    }
  })
  const sort = computed({
    get: () => query.value.sort,
    set: (value: CatalogQuery['sort']) => {
      void change({ sort: value, page: 1 })
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
  const hasFilters = computed(() => Boolean(query.value.q) || query.value.locale !== 'all')
  return {
    query,
    search,
    locale,
    sort,
    page,
    pageSize,
    hasFilters,
    list,
    languages,
    submitSearch,
    reset
  }
}

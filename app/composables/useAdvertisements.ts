import type {
  Advertisement,
  AdvertisementPage,
  AdvertisementSettings
} from '#shared/types/advertisements'
import { adQuerySchema } from '#shared/utils/advertisements'

export function useAdvertisements() {
  const api = useApi()
  const route = useRoute()
  const router = useRouter()
  const query = computed(() => {
    const parsed = adQuerySchema.safeParse(route.query)
    return parsed.success ? parsed.data : adQuerySchema.parse({})
  })
  const search = ref(query.value.q)
  watch(
    () => query.value.q,
    (value) => {
      search.value = value
    }
  )
  const key = computed(() => 'advertisements:' + JSON.stringify(query.value))
  const list = useAsyncData(key, (_, { signal }) =>
    api.request<AdvertisementPage>(
      '/advertisements',
      { params: query.value, signal },
      { error: false }
    )
  )
  const settings = useAsyncData('advertisement-settings', () =>
    api.request<AdvertisementSettings>('/advertisements/settings', {}, { error: false })
  )
  const busyId = ref<number | null>(null)
  const archiveTarget = ref<Advertisement | null>(null)
  const archiveOpen = ref(false)
  async function change(patch: Partial<typeof query.value>) {
    const value = adQuerySchema.parse({ ...query.value, ...patch })
    await router.replace({
      query: {
        ...(value.q ? { q: value.q } : {}),
        ...(value.status !== 'all' ? { status: value.status } : {}),
        ...(value.destination_type !== 'all' ? { destination_type: value.destination_type } : {}),
        ...(value.page > 1 ? { page: value.page } : {}),
        ...(value.per_page !== 10 ? { per_page: value.per_page } : {})
      }
    })
  }
  const statusFilter = computed({
    get: () => query.value.status,
    set: (value) => {
      void change({ status: value, page: 1 })
    }
  })
  const typeFilter = computed({
    get: () => query.value.destination_type,
    set: (value) => {
      void change({ destination_type: value, page: 1 })
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
  watch(
    () => list.data.value,
    (value) => {
      if (value && value.lastPage < page.value) page.value = Math.max(1, value.lastPage)
    }
  )
  async function submitSearch() {
    await change({ q: search.value.trim(), page: 1 })
  }
  async function reset() {
    search.value = ''
    await router.replace({ query: {} })
  }
  async function toggle(ad: Advertisement) {
    if (busyId.value || ad.deleted_at) return
    busyId.value = ad.id
    try {
      await api.request(
        `/advertisements/${ad.id}`,
        { method: 'PATCH', data: { is_active: !ad.is_active, expected_revision: ad.revision } },
        {
          success: ad.is_active
            ? 'Reklam durduruldu.'
            : 'Reklam etkinleştirildi. Yayın tarihleri ve kotalar uygulanır.'
        }
      )
    } catch {
      /* Ortak istemci hatayı gösterir; liste güncel sürümle yenilenir. */
    } finally {
      busyId.value = null
      await list.refresh()
    }
  }
  function confirmArchive(ad: Advertisement) {
    archiveTarget.value = ad
    archiveOpen.value = true
  }
  async function archive() {
    const ad = archiveTarget.value
    if (!ad || busyId.value) return
    busyId.value = ad.id
    try {
      await api.request(
        `/advertisements/${ad.id}`,
        { method: 'DELETE' },
        { success: 'Reklam arşivlendi. Raporları korunuyor.' }
      )
      archiveOpen.value = false
      await list.refresh()
    } catch {
      /* Hata ortak istemciden gösterilir. */
    } finally {
      busyId.value = null
    }
  }
  return {
    query,
    search,
    statusFilter,
    typeFilter,
    page,
    pageSize,
    list,
    settings,
    busyId,
    archiveTarget,
    archiveOpen,
    submitSearch,
    reset,
    toggle,
    confirmArchive,
    archive
  }
}

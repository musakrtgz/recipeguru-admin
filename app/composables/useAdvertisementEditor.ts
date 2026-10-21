import axios from 'axios'
import type { ApiFailure } from '#shared/types/api'
import type { Advertisement, AdvertisementDraft } from '#shared/types/advertisements'
import { adDraft, adSaveSchema, adImageError, isoDateTime } from '#shared/utils/advertisements'

export function useAdvertisementEditor(
  id: () => number | null,
  open: Ref<boolean>,
  saved: () => void
) {
  const api = useApi()
  const detail = ref<Advertisement | null>(null)
  const draft = ref<AdvertisementDraft | null>(null)
  const image = ref<File | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const conflict = ref(false)
  const error = ref('')
  const fields = ref<Record<string, string[]>>({})
  const archived = computed(() => Boolean(detail.value?.deleted_at))
  let controller: AbortController | undefined
  let sequence = 0
  async function load() {
    controller?.abort()
    controller = new AbortController()
    const current = ++sequence
    loading.value = true
    detail.value = null
    draft.value = null
    image.value = null
    error.value = ''
    fields.value = {}
    conflict.value = false
    try {
      const value = id()
        ? await api.request<Advertisement>(
            `/advertisements/${id()}`,
            { signal: controller.signal },
            { error: false }
          )
        : null
      if (current === sequence && open.value) {
        detail.value = value
        draft.value = adDraft(value)
      }
    } catch (failure) {
      if (current === sequence && !axios.isCancel(failure))
        error.value = (failure as ApiFailure).message
    } finally {
      if (current === sequence) loading.value = false
    }
  }
  async function save() {
    if (!draft.value || saving.value || conflict.value || archived.value) return
    const value = draft.value
    const parsed = adSaveSchema.safeParse({
      ...value,
      starts_at: isoDateTime(value.starts_at),
      ends_at: isoDateTime(value.ends_at),
      destination_id: value.destination_type === 'external' ? null : value.destination_id,
      external_url: value.destination_type === 'external' ? value.external_url : null,
      expected_revision: detail.value?.revision
    })
    const imageError = adImageError(image.value, !id())
    fields.value = {
      ...(!parsed.success ? parsed.error.flatten().fieldErrors : {}),
      ...(imageError ? { image: [imageError] } : {})
    }
    if (!parsed.success || imageError) {
      error.value = 'İşaretli alanları kontrol edip yeniden kaydedin.'
      return
    }
    const form = new FormData()
    for (const [key, item] of Object.entries(parsed.data)) {
      if (item !== undefined)
        form.set(
          key,
          item === null ? '' : typeof item === 'boolean' ? (item ? '1' : '0') : String(item)
        )
    }
    if (image.value) form.set('image', image.value)
    saving.value = true
    error.value = ''
    try {
      await api.request<Advertisement>(
        id() ? `/advertisements/${id()}` : '/advertisements',
        { method: 'POST', data: form, timeout: 90000 },
        { success: id() ? 'Reklam güncellendi.' : 'Reklam kampanyası oluşturuldu.', error: false }
      )
      open.value = false
      saved()
    } catch (failure) {
      const result = failure as ApiFailure
      error.value = result.message
      fields.value = result.errors
      conflict.value = result.statusCode === 409
    } finally {
      saving.value = false
    }
  }
  watch([open, id], () => {
    if (open.value) void load()
    else {
      sequence++
      controller?.abort()
      draft.value = null
      detail.value = null
      image.value = null
      loading.value = false
      error.value = ''
      fields.value = {}
      conflict.value = false
    }
  })
  onBeforeUnmount(() => {
    sequence++
    controller?.abort()
  })
  return { detail, draft, image, loading, saving, conflict, error, fields, archived, load, save }
}

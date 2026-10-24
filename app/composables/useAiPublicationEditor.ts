import axios from 'axios'
import type { AiPublication, AiAction } from '#shared/utils/aiPublications'
import { aiEditSchema } from '#shared/utils/aiPublications'
import type { ApiFailure } from '#shared/types/api'
import type { RecipeEditDraft } from '#shared/utils/recipeReview'
import { isoDateTime, localDateTime } from '#shared/utils/advertisements'

export function useAiPublicationEditor(
  id: () => number | null,
  open: Ref<boolean>,
  changed: () => void
) {
  const api = useApi()
  const detail = ref<AiPublication | null>(null),
    loading = ref(false),
    saving = ref(false),
    editing = ref(false),
    error = ref(''),
    conflict = ref(false),
    note = ref(''),
    scheduled = ref('')
  const fields = ref<Record<string, string[]>>({})
  const draft = ref<RecipeEditDraft>({
    title: '',
    person_count: '',
    cooking_time: '',
    tips: '',
    ingredients: [],
    preparation: '',
    content: ''
  })
  let controller: AbortController | undefined
  let sequence = 0
  let pending = false
  function accept(value: AiPublication) {
    detail.value = value
    fields.value = {}
    error.value = ''
    conflict.value = false
    note.value = value.review_note || ''
    editing.value = false
  }
  async function load(background = false) {
    if (!id() || !open.value || (background && (saving.value || editing.value || conflict.value || pending))) return
    controller?.abort()
    controller = new AbortController()
    const current = ++sequence
    pending = true
    if (!background) {
      loading.value = true
      error.value = ''
      editing.value = false
    }
    try {
      const value = await api.request<AiPublication>(
        '/ai-publications/' + id(),
        { signal: controller.signal },
        { error: false }
      )
      if (current === sequence && open.value && (!background || (!editing.value && !saving.value && !conflict.value))) {
        const previousNote = note.value
        const keepNote = background && previousNote !== (detail.value?.review_note || '')
        accept(value)
        if (keepNote) note.value = previousNote
      }
    } catch (failure) {
      if (current === sequence && !axios.isCancel(failure))
        error.value = (failure as ApiFailure).message
    } finally {
      if (current === sequence) {
        loading.value = false
        pending = false
      }
    }
  }
  watch(
    [id, open],
    () => {
      if (open.value) {
        detail.value = null
        void load()
      } else {
        ++sequence
        pending = false
        controller?.abort()
        error.value = ''
        fields.value = {}
        conflict.value = false
      }
    },
    { immediate: true }
  )
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !error.value
        && detail.value && ['planned', 'generating'].includes(detail.value.status))
        void load(true)
    }, 5000)
  })
  onBeforeUnmount(() => {
    ++sequence
    controller?.abort()
    if (timer) clearInterval(timer)
  })
  function edit() {
    const value = detail.value?.draft
    if (!value) return
    draft.value = {
      title: value.title,
      person_count: String(value.person_count),
      cooking_time: String(value.cooking_time),
      tips: value.tips || '',
      ingredients: [...value.ingredients],
      preparation: value.preparation,
      content: ''
    }
    scheduled.value = localDateTime(detail.value!.scheduled_at)
    fields.value = {}
    error.value = ''
    editing.value = true
  }
  async function mutate(path: string, method: 'POST' | 'PATCH', data: unknown, success: string) {
    if (saving.value) return
    saving.value = true
    error.value = ''
    fields.value = {}
    try {
      const value = await api.request<AiPublication>(
        path,
        { method, data },
        { success, error: false }
      )
      accept(value)
      changed()
    } catch (failure) {
      const value = failure as ApiFailure
      error.value = value.message
      fields.value = value.errors
      conflict.value = value.statusCode === 409
    } finally {
      saving.value = false
    }
  }
  async function save() {
    if (!detail.value) return
    const value = draft.value
    const parsed = aiEditSchema.safeParse({
      revision: detail.value.revision,
      draft: {
        title: value.title,
        ingredients: value.ingredients,
        preparation: value.preparation,
        person_count: value.person_count,
        cooking_time: value.cooking_time,
        tips: value.tips || null
      },
      ...(!detail.value.manual_preparation ? { scheduled_at: isoDateTime(scheduled.value) } : {})
    })
    fields.value = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] === 'draft' ? issue.path[1] : issue.path[0])
        fields.value[key] ||= []
        fields.value[key]!.push(issue.message)
      }
      error.value = 'Eksik alanları tamamlayın.'
      return
    }
    await mutate(
      '/ai-publications/' + detail.value.id,
      'PATCH',
      parsed.data,
      'Tarif güncellendi; kontrol ve kapak yeniden hazırlanacak.'
    )
  }
  async function action(value: AiAction) {
    if (!detail.value) return
    if (value === 'reject' && !note.value.trim()) {
      fields.value = { note: ['Ret nedenini yazın.'] }
      return
    }
    await mutate(
      '/ai-publications/' + detail.value.id + '/' + value,
      'POST',
      {
        revision: detail.value.revision,
        ...(note.value.trim() ? { note: note.value.trim() } : {})
      },
      value === 'publish-now'
        ? 'Tarif şimdi yayınlandı.'
        : value === 'approve'
          ? 'Tarif onaylandı; yayın saatini bekliyor.'
          : 'Yayın planı güncellendi.'
    )
  }
  return {
    detail,
    loading,
    saving,
    editing,
    error,
    conflict,
    note,
    scheduled,
    fields,
    draft,
    load,
    edit,
    save,
    action
  }
}

import axios from 'axios'
import type { ApiEnvelope, ApiFailure, RecipeStatus, SubmittedRecipe } from '#shared/types/api'
import type { RecipeEditDraft } from '#shared/utils/recipeReview'
import { recipeEditSchema, recipeEditErrors } from '#shared/utils/recipeReview'

export function useRecipeReview(
  id: () => number | undefined,
  open: Ref<boolean>,
  changed: () => void
) {
  const api = useApi()
  const detail = ref<SubmittedRecipe | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const editing = ref(false)
  const conflict = ref(false)
  const error = ref('')
  const fields = ref<Record<string, string[]>>({})
  const note = ref('')
  const draft = ref<RecipeEditDraft>({
    title: '',
    person_count: '',
    cooking_time: '',
    tips: '',
    ingredients: [],
    preparation: '',
    content: ''
  })
  const structured = computed(() =>
    Boolean(detail.value?.ingredients?.length && detail.value?.preparation)
  )
  let controller: AbortController | undefined
  let sequence = 0
  function accept(value: SubmittedRecipe) {
    detail.value = value
    note.value = value.review_note || ''
    fields.value = {}
    conflict.value = false
    error.value = ''
  }
  async function load() {
    if (!id() || !open.value) return
    controller?.abort()
    controller = new AbortController()
    const current = ++sequence
    loading.value = true
    editing.value = false
    detail.value = null
    error.value = ''
    try {
      const value = await api.request<SubmittedRecipe>(
        `/recipes/${id()}`,
        { signal: controller.signal },
        { error: false }
      )
      if (current === sequence && open.value) accept(value)
    } catch (failure) {
      if (current === sequence && !axios.isCancel(failure))
        error.value = (failure as ApiFailure).message
    } finally {
      if (current === sequence) loading.value = false
    }
  }
  function edit() {
    const value = detail.value
    if (!value) return
    draft.value = {
      title: value.title,
      person_count: String(value.person_count),
      cooking_time: value.cooking_time == null ? '' : String(value.cooking_time),
      tips: value.tips || '',
      ingredients: [...(value.ingredients || [''])],
      preparation: value.preparation || '',
      content: value.content || ''
    }
    fields.value = {}
    error.value = ''
    editing.value = true
  }
  function cancelEdit() {
    editing.value = false
    fields.value = {}
    if (!conflict.value) error.value = ''
  }
  async function mutate(path: string, data: unknown, message: string) {
    saving.value = true
    error.value = ''
    fields.value = {}
    try {
      const result = await api.request<ApiEnvelope<SubmittedRecipe>>(
        path,
        { method: 'PATCH', data },
        { success: message, error: false }
      )
      accept(result.data)
      editing.value = false
      changed()
      return true
    } catch (failure) {
      const value = failure as ApiFailure
      error.value = value.message
      fields.value = value.errors
      if (value.statusCode === 409) {
        conflict.value = true
        changed()
      }
      return false
    } finally {
      saving.value = false
    }
  }
  async function save() {
    if (!detail.value || saving.value || conflict.value) return
    const value = draft.value
    const data = {
      revision: detail.value.revision,
      title: value.title,
      person_count: value.person_count,
      cooking_time: value.cooking_time,
      tips: value.tips.trim() || null,
      ...(structured.value
        ? { ingredients: value.ingredients, preparation: value.preparation }
        : { content: value.content })
    }
    const parsed = recipeEditSchema.safeParse(data)
    if (!parsed.success) {
      fields.value = recipeEditErrors(data)
      error.value = 'İşaretli alanları kontrol edip tekrar kaydedin.'
      return
    }
    await mutate(`/recipes/${detail.value.id}`, parsed.data, 'Tarif kaydedildi.')
  }
  async function review(status: RecipeStatus): Promise<boolean> {
    if (!detail.value || saving.value || conflict.value || status === detail.value.status)
      return false
    fields.value = {}
    if (status === 'rejected' && !note.value.trim()) {
      fields.value.review_note = [
        'Kullanıcının tarifini düzeltebilmesi için reddetme nedenini yazın.'
      ]
      return false
    }
    return await mutate(
      `/recipes/${detail.value.id}/review`,
      {
        revision: detail.value.revision,
        status,
        review_note: note.value.trim() || undefined
      },
      status === 'pending'
        ? detail.value.status === 'approved'
          ? 'Tarif yayından kaldırıldı ve yeniden incelemeye alındı.'
          : 'Tarif yeniden incelemeye alındı.'
        : status === 'approved'
          ? 'Tarif onaylandı ve yayına alındı.'
          : 'Tarif reddedildi.'
    )
  }
  watch([open, id], () => {
    if (open.value) void load()
    else {
      sequence++
      controller?.abort()
      detail.value = null
      loading.value = false
      editing.value = false
    }
  })
  onBeforeUnmount(() => {
    sequence++
    controller?.abort()
  })
  return {
    detail,
    loading,
    saving,
    editing,
    conflict,
    error,
    fields,
    note,
    draft,
    structured,
    load,
    edit,
    cancelEdit,
    save,
    review
  }
}

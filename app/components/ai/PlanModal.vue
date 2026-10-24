<script setup lang="ts">
import type { AiProfile, AiPublication } from '#shared/utils/aiPublications'
import type { ApiFailure } from '#shared/types/api'
import { aiCreateSchema } from '#shared/utils/aiPublications'
import { isoDateTime, localDateTime } from '#shared/utils/advertisements'

const props = defineProps<{ profiles: AiProfile[], selectedId?: number | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [id: number] }>()
const api = useApi()
const profile = ref(''),
  scheduled = ref(''),
  error = ref(''),
  saving = ref(false)
const fields = ref<Record<string, string[]>>({})
watch(open, (value) => {
  if (!value) return
  profile.value = String(
    props.selectedId || props.profiles.find(item => item.available && item.enabled)?.id || ''
  )
  scheduled.value = localDateTime(new Date(Date.now() + 5 * 60000).toISOString())
  error.value = ''
  fields.value = {}
})
async function save() {
  const parsed = aiCreateSchema.safeParse({
    profile_id: Number(profile.value),
    scheduled_at: isoDateTime(scheduled.value)
  })
  fields.value = parsed.success ? {} : parsed.error.flatten().fieldErrors
  if (!parsed.success || saving.value) return
  saving.value = true
  try {
    const row = await api.request<AiPublication>(
      '/ai-publications',
      { method: 'POST', data: parsed.data },
      { success: 'Tarif hazırlama planı kaydedildi.', error: false }
    )
    open.value = false
    emit('saved', row.id)
  } catch (failure) {
    error.value = (failure as ApiFailure).message
    fields.value = (failure as ApiFailure).errors
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiAppModal
    v-model:open="open"
    title="Tarif hazırlama planı"
    description="Tarif ve kapak görseli OpenAI ile hazırlanır. Onay ve günlük bütçe ayarları uygulanır."
    :busy="saving"
  >
    <form
      id="ai-plan-form"
      class="space-y-5"
      @submit.prevent="save"
    >
      <UFormField
        label="AI profili"
        name="profile_id"
        :error="fields.profile_id?.[0]"
        required
      >
        <UiAppSelect
          v-model="profile"
          label="AI profili seçin"
          :items="
            profiles
              .filter((item) => item.available && item.enabled)
              .map((item) => ({ label: item.name, value: String(item.id) }))
          "
          :disabled="saving"
        />
      </UFormField>
      <UiAppInput
        v-model="scheduled"
        type="datetime-local"
        label="Yayın saati (cihaz saati)"
        name="scheduled_at"
        step="1"
        required
        :disabled="saving"
        :error="fields.scheduled_at?.[0]"
      />
      <p class="text-xs leading-6 text-muted">
        Onay gecikirse tarif onaydan sonraki ilk planlayıcı çalışmasında yayınlanır. Günlük
        kontenjan doluysa listedeki mevcut planı açın.
      </p>
      <UiAppAlert
        v-if="error"
        title="Plan oluşturulamadı"
        :description="error"
      />
    </form>
    <template #footer>
      <UiAppButton
        label="Vazgeç"
        variant="outline"
        color="neutral"
        :disabled="saving"
        @click="open = false"
      /><UiAppButton
        label="Planla ve hazırlamaya başla"
        icon="i-lucide-sparkles"
        type="submit"
        form="ai-plan-form"
        :loading="saving"
      />
    </template>
  </UiAppModal>
</template>

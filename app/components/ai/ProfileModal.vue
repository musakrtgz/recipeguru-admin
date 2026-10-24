<script setup lang="ts">
import type { AiProfile } from '#shared/utils/aiPublications'
import type { ApiFailure } from '#shared/types/api'
import { aiProfileWrite } from '#shared/utils/aiPublications'

const props = defineProps<{ profile: AiProfile | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()
const api = useApi()
const saving = ref(false),
  error = ref('')
const fields = ref<Record<string, string[]>>({})
const draft = reactive({
  revision: 1,
  enabled: true,
  locale: 'tr',
  times: '',
  instruction: '',
  image_style: ''
})
watch([open, () => props.profile?.id], () => {
  if (!open.value || !props.profile) return
  Object.assign(draft, { ...props.profile, times: props.profile.times.join(', ') })
  fields.value = {}
  error.value = ''
})
async function save() {
  if (!props.profile || saving.value) return
  const parsed = aiProfileWrite.safeParse({
    revision: draft.revision,
    enabled: draft.enabled,
    locale: draft.locale,
    times: draft.times.split(',').map(value => value.trim()),
    instruction: draft.instruction,
    image_style: draft.image_style
  })
  fields.value = parsed.success ? {} : parsed.error.flatten().fieldErrors
  if (!parsed.success) return
  saving.value = true
  try {
    await api.request(
      '/ai-publications/profiles/' + props.profile.id,
      { method: 'PUT', data: parsed.data },
      { success: 'Profilin yayın kuralları kaydedildi.', error: false }
    )
    open.value = false
    emit('saved')
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
    :title="profile?.name || 'AI yayın profili'"
    description="Yeni hazırlanan planlar bu kuralları kullanır; mevcut taslakların kuralları korunur."
    :busy="saving"
  >
    <form
      id="ai-profile-form"
      class="space-y-5"
      @submit.prevent="save"
    >
      <UiAppSwitch
        v-model="draft.enabled"
        label="Bu profilin otomasyonu açık"
        description="Kapalıyken yeni üretim ve zamanlı yayın durur."
        :disabled="saving"
      />
      <UiAppInput
        v-model="draft.times"
        label="Paylaşım saatleri (İstanbul)"
        name="times"
        placeholder="07:30, 15:00"
        required
        :disabled="saving"
        :error="fields.times?.[0]"
      />
      <p class="text-xs text-muted">
        Virgülle ayırarak en fazla 3 saat yazın. Saat sayısı, profilin günlük tarif sınırını
        belirler.
      </p>
      <UFormField
        label="Tarif dili"
        name="locale"
        :error="fields.locale?.[0]"
      >
        <UiAppSelect
          v-model="draft.locale"
          label="Tarif dili"
          :items="[
            { label: 'Türkçe', value: 'tr' },
            { label: 'İngilizce', value: 'en' }
          ]"
          :disabled="saving"
        />
      </UFormField>
      <UiAppTextarea
        v-model="draft.instruction"
        label="Tarif ve anlatım kuralları"
        name="instruction"
        :maxlength="4000"
        required
        :disabled="saving"
        :error="fields.instruction?.[0]"
      />
      <UiAppTextarea
        v-model="draft.image_style"
        label="Fotoğraf tarzı"
        name="image_style"
        :maxlength="2000"
        required
        :disabled="saving"
        :error="fields.image_style?.[0]"
      />
      <UiAppAlert
        v-if="error"
        title="Profil kaydedilemedi"
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
        label="Kuralları kaydet"
        type="submit"
        form="ai-profile-form"
        :loading="saving"
      />
    </template>
  </UiAppModal>
</template>

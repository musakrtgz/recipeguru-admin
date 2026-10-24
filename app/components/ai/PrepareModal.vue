<script setup lang="ts">
import type { AiProfile, AiPublication, AiSettings } from '#shared/utils/aiPublications'
import type { ApiFailure } from '#shared/types/api'
import { aiPrepareSchema } from '#shared/utils/aiPublications'

const props = defineProps<{ profiles: AiProfile[], settings: AiSettings | null, selectedId?: number | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [id: number] }>()
const api = useApi()
const profile = ref(''), brief = ref(''), error = ref(''), saving = ref(false)
const fields = ref<Record<string, string[]>>({})
const availableProfiles = computed(() => props.profiles.filter(item => item.available))
const selected = computed(() => availableProfiles.value.find(item => String(item.id) === profile.value))
let submission: { fingerprint: string, requestId: string } | null = null
watch(open, (value) => {
  if (!value) return
  profile.value = String(props.selectedId || availableProfiles.value[0]?.id || '')
  brief.value = ''
  error.value = ''
  fields.value = {}
  submission = null
})
async function save() {
  if (saving.value) return
  const value = { profile_id: Number(profile.value), brief: brief.value.trim() }
  const fingerprint = JSON.stringify(value)
  if (!submission || submission.fingerprint !== fingerprint)
    submission = { fingerprint, requestId: crypto.randomUUID() }
  const parsed = aiPrepareSchema.safeParse({ ...value, request_id: submission.requestId })
  fields.value = parsed.success ? {} : parsed.error.flatten().fieldErrors
  error.value = ''
  if (!parsed.success) return
  if (!props.settings?.provider_configured) {
    error.value = 'OpenAI bağlantısı hazır değil. Sunucudaki bağlantı ayarlarını kontrol edin.'
    return
  }
  saving.value = true
  try {
    const row = await api.request<AiPublication>(
      '/ai-publications/prepare',
      { method: 'POST', data: parsed.data },
      { success: 'Tarif hazırlama isteği alındı. İlerlemeyi buradan izleyebilirsiniz.', error: false }
    )
    open.value = false
    emit('saved', row.id)
  } catch (failure) {
    const value = failure as ApiFailure
    error.value = value.message
    fields.value = value.errors
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiAppModal
    v-model:open="open"
    title="AI ile tarif hazırla"
    description="Profili seçin; tarif, kontrol ve kapak fotoğrafı hazırlansın. Yayınlama kararını siz verin."
    :busy="saving"
  >
    <form
      id="ai-prepare-form"
      class="space-y-5"
      @submit.prevent="save"
    >
      <UiAppAlert
        v-if="!settings?.provider_configured"
        title="OpenAI bağlantısı hazır değil"
        description="Sunucudaki OpenAI bağlantısı ayarlandıktan sonra tarif hazırlayabilirsiniz."
        color="warning"
      />
      <UiAppAlert
        v-if="!availableProfiles.length"
        title="Kullanılabilir AI profili yok"
        description="Tarif hazırlamak için görünür ve kullanılabilir bir AI hesabı gerekir."
        color="warning"
      />
      <UFormField
        label="AI profili"
        name="profile_id"
        :error="fields.profile_id?.[0]"
        required
      >
        <UiAppSelect
          v-model="profile"
          label="AI profili seçin"
          :items="availableProfiles.map(item => ({ label: item.name + ' · ' + item.type_label, value: String(item.id) }))"
          :disabled="saving"
          class="w-full"
        />
      </UFormField>
      <div
        v-if="selected"
        class="flex flex-wrap items-center gap-2 text-sm text-muted"
      >
        <UiAppBadge color="primary">
          AI
        </UiAppBadge>
        <span>{{ selected.type_label }} · {{ selected.locale.toUpperCase() }}</span>
      </div>
      <UiAppTextarea
        v-model="brief"
        label="İstediğiniz tarif veya ek not (isteğe bağlı)"
        name="brief"
        placeholder="Örneğin: Spoonful tarifi veya fırın kullanmadan çikolatalı bir tatlı."
        :maxlength="1000"
        :disabled="saving"
        :error="fields.brief?.[0]"
      />
      <p class="text-xs leading-6 text-muted">
        Bir tarif adı yazarsanız o tarif hazırlanır. Boş bırakırsanız profilin uzmanlığına göre seçim yapılır; ek özellikler de dikkate alınır.
      </p>
      <UiAppAlert
        title="Hazırlanır, onayınızı bekler"
        description="Otomasyon kapalıyken de çalışır. Tarif ve yatay kapak hazırlanır; siz yayınlamadan paylaşılmaz. Günlük toplam tarif sınırı ve OpenAI bütçesi uygulanır."
        color="info"
        icon="i-lucide-sparkles"
      />
      <UiAppAlert
        v-if="error"
        title="Tarif hazırlama başlatılamadı"
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
      />
      <UiAppButton
        label="Tarifi hazırlamaya başla"
        icon="i-lucide-sparkles"
        type="submit"
        form="ai-prepare-form"
        :loading="saving"
        :disabled="!settings?.provider_configured || !availableProfiles.length"
      />
    </template>
  </UiAppModal>
</template>

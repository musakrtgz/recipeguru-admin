<script setup lang="ts">
import type { AiSettings } from '#shared/utils/aiPublications'
import type { ApiFailure } from '#shared/types/api'
import { aiSettingsWrite, aiDate, aiMoney } from '#shared/utils/aiPublications'

const props = defineProps<{ settings: AiSettings | null, loading?: boolean, failed?: boolean }>()
const emit = defineEmits<{ saved: [], retry: [] }>()
const api = useApi()
const saving = ref(false),
  dirty = ref(false),
  error = ref(''),
  conflict = ref(false)
const errors = ref<Record<string, string[]>>({})
const draft = reactive({
  revision: 1,
  enabled: false,
  require_admin_review: true,
  daily_budget_usd: '5',
  request_reservation_usd: '0.5',
  daily_publication_limit: '7'
})
function accept(value: AiSettings) {
  Object.assign(draft, {
    revision: value.revision,
    enabled: value.enabled,
    require_admin_review: value.require_admin_review,
    daily_budget_usd: String(value.daily_budget_usd),
    request_reservation_usd: String(value.request_reservation_usd),
    daily_publication_limit: String(value.daily_publication_limit)
  })
  dirty.value = false
  conflict.value = false
  errors.value = {}
  error.value = ''
}
watch(
  () => props.settings,
  (value) => {
    if (!value) return
    if (!dirty.value) accept(value)
    else if (value.revision !== draft.revision) conflict.value = true
  },
  { immediate: true }
)
function reloadSettings() {
  dirty.value = false
  emit('retry')
}
async function save() {
  const parsed = aiSettingsWrite.safeParse({ ...draft, timezone: 'Europe/Istanbul' })
  errors.value = parsed.success ? {} : parsed.error.flatten().fieldErrors
  if (!parsed.success || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const result = await api.request<AiSettings>(
      '/ai-publications/settings',
      { method: 'PUT', data: parsed.data },
      { success: 'AI yayın ayarları kaydedildi.', error: false }
    )
    accept(result)
    emit('saved')
  } catch (failure) {
    const value = failure as ApiFailure
    error.value = value.message
    errors.value = value.errors
    conflict.value = value.statusCode === 409
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiAppCard
    title="Yayın kontrolü"
    description="Tarif hazırlama, inceleme ve bütçe ayarları"
  >
    <UiAppAlert
      v-if="failed"
      title="Yayın ayarları alınamadı"
    >
      <template #actions>
        <UiAppButton
          label="Tekrar dene"
          variant="outline"
          @click="emit('retry')"
        />
      </template>
    </UiAppAlert>
    <div
      v-else-if="!settings || loading"
      role="status"
      aria-label="AI yayın ayarları yükleniyor"
    >
      <USkeleton class="h-36 w-full" />
    </div>
    <form
      v-else
      class="space-y-5"
      @submit.prevent="save"
      @input="dirty = true"
      @change="dirty = true"
    >
      <UiAppAlert
        v-if="!settings.provider_configured"
        title="OpenAI bağlantısı hazır değil"
        description="Sunucuda OpenAI anahtarı tanımlandıktan sonra otomatik hazırlamayı etkinleştirebilirsiniz."
        color="warning"
      />
      <div class="grid gap-5 lg:grid-cols-2">
        <UiAppSwitch
          v-model="draft.enabled"
          label="Otomatik tarif hazırlama"
          description="Açıldığında planlanan tarifler OpenAI ile hazırlanır; günlük bütçe uygulanır."
          :disabled="saving || !settings.provider_configured"
          @update:model-value="dirty = true"
        />
        <UiAppSwitch
          v-model="draft.require_admin_review"
          label="Yayından önce admin onayı"
          description="Açıkken hazırlanan her tarif sizin onayınızı bekler. Kapalıyken olumlu AI kontrolü yeterlidir."
          :disabled="saving"
          @update:model-value="dirty = true"
        />
      </div>
      <UiAppAlert
        v-if="!draft.require_admin_review"
        title="Otomatik yayın seçildi"
        description="Kontrolden geçen görselli tarifler, yayın saatinde ilgili AI hesabından paylaşılacak."
        color="warning"
      />
      <div class="grid gap-4 sm:grid-cols-3">
        <UiAppInput
          v-model="draft.daily_publication_limit"
          label="Günlük toplam tarif sınırı"
          name="daily_publication_limit"
          type="number"
          min="1"
          max="21"
          required
          :disabled="saving"
          :error="errors.daily_publication_limit?.[0]"
        />
        <UiAppInput
          v-model="draft.daily_budget_usd"
          label="Günlük bütçe (USD)"
          name="daily_budget_usd"
          type="number"
          min="0.1"
          max="100"
          step="0.1"
          required
          :disabled="saving"
          :error="errors.daily_budget_usd?.[0]"
        />
        <UiAppInput
          v-model="draft.request_reservation_usd"
          label="İstek başına bütçe payı (USD)"
          name="request_reservation_usd"
          type="number"
          min="0.1"
          max="10"
          step="0.1"
          required
          :disabled="saving"
          :error="errors.request_reservation_usd?.[0]"
        />
      </div>
      <p class="text-xs leading-6 text-muted">
        Her OpenAI çağrısından önce bütçeden bir pay ayrılır. Kullanım bilgisi geldikçe tahmini
        maliyet hesaplanır; belirsiz denemelerin payı korunur. Buradaki sınır bu modüle aittir;
        OpenAI faturasının birebir karşılığı değildir.
      </p>
      <UiAppAlert
        v-if="error"
        title="Ayarlar kaydedilemedi"
        :description="error"
      />
      <UiAppAlert
        v-if="conflict"
        title="Güncel ayarları kontrol edin"
        description="Taslağınız korunuyor. Yeniden yükleyerek son ayarlardan başlayabilirsiniz."
        color="warning"
      >
        <template #actions>
          <UiAppButton
            label="Taslağı bırak ve günceli yükle"
            variant="outline"
            @click="reloadSettings"
          />
        </template>
      </UiAppAlert>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-xs text-muted">
          İstanbul saati · Son planlama: {{ aiDate(settings.last_tick_at) }} · Son üretim:
          {{ aiDate(settings.last_worker_at) }}
        </p>
        <UiAppButton
          label="Ayarları kaydet"
          icon="i-lucide-save"
          type="submit"
          :loading="saving"
          :disabled="conflict"
        />
      </div>
      <div class="flex flex-wrap gap-x-6 gap-y-2 border-t border-default pt-4 text-xs text-dimmed">
        <span>Tarif: {{ settings.text_model }}</span><span>Görsel: {{ settings.image_model }}</span><span>Bugünkü bütçe kullanımı: {{ aiMoney(settings.today.charged_usd) }}</span>
      </div>
    </form>
  </UiAppCard>
</template>

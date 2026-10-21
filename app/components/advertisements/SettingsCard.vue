<script setup lang="ts">
import type { AdvertisementSettings } from '#shared/types/advertisements'
import type { ApiFailure } from '#shared/types/api'
import { adSettingsSchema } from '#shared/utils/advertisements'

const props = defineProps<{
  settings: AdvertisementSettings | null
  loading?: boolean
  failed?: boolean
}>()
const emit = defineEmits<{ saved: [], retry: [] }>()
const api = useApi()
const enabled = ref(false)
const interval = ref('3')
const saving = ref(false)
const error = ref('')
const intervalError = ref('')
watch(
  () => props.settings,
  (value) => {
    if (value) {
      enabled.value = value.enabled
      interval.value = String(value.organic_interval)
    }
  },
  { immediate: true }
)
async function save() {
  const parsed = adSettingsSchema.safeParse({
    enabled: enabled.value,
    organic_interval: interval.value
  })
  intervalError.value = parsed.success
    ? ''
    : parsed.error.flatten().fieldErrors.organic_interval?.[0] || ''
  if (!parsed.success || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await api.request(
      '/advertisements/settings',
      { method: 'PUT', data: parsed.data },
      { success: 'Reklam yayın ayarları kaydedildi.', error: false }
    )
    emit('saved')
  } catch (failure) {
    error.value = (failure as ApiFailure).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiAppCard
    title="Akışta reklam yayını"
    description="Ana sayfadaki tüm sponsorlu gönderilerin sıklığını yönetin."
  >
    <UiAppAlert
      v-if="failed"
      title="Yayın ayarları alınamadı"
      description="Ayarları yükledikten sonra değişiklik yapabilirsiniz."
    >
      <template #actions>
        <UiAppButton
          label="Tekrar dene"
          color="neutral"
          variant="outline"
          @click="emit('retry')"
        />
      </template>
    </UiAppAlert>
    <div
      v-else-if="loading || !settings"
      role="status"
      class="space-y-4"
    >
      <USkeleton class="h-8 w-56" /><USkeleton class="h-10 w-full" />
    </div>
    <form
      v-else
      class="space-y-5"
      @submit.prevent="save"
    >
      <UiAppSwitch
        v-model="enabled"
        :label="enabled ? 'Sponsorlu gönderiler açık' : 'Sponsorlu gönderiler kapalı'"
        description="Kapatıldığında tüm kampanyaların akışa yeni reklam sunması durur."
        :disabled="saving"
      />
      <div class="flex flex-wrap items-end gap-4">
        <div class="w-full sm:w-64">
          <UiAppInput
            v-model="interval"
            label="Reklam aralığı (gönderi)"
            name="organic_interval"
            type="number"
            min="1"
            max="50"
            step="1"
            required
            :error="intervalError"
            :disabled="saving"
          />
        </div>
        <UiAppButton
          label="Yayın ayarlarını kaydet"
          type="submit"
          icon="i-lucide-settings-2"
          :loading="saving"
        />
      </div>
      <p class="text-xs text-muted">
        Kaydedilen sıklık: {{ settings.organic_interval }} normal gönderi → 1 sponsorlu gönderi. Kampanya tarihleri ve
        kotaları ayrıca uygulanır.
      </p>
      <UiAppAlert
        v-if="error"
        title="Ayarlar kaydedilemedi"
        :description="error"
      />
    </form>
  </UiAppCard>
</template>

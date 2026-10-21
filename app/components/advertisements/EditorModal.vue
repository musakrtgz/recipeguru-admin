<script setup lang="ts">
const props = defineProps<{ advertisementId: number | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()
const formRoot = ref<HTMLElement | null>(null)
const errorAnchor = ref<HTMLElement | null>(null)
const { detail, draft, image, loading, saving, conflict, error, fields, archived, load, save }
  = useAdvertisementEditor(
    () => props.advertisementId,
    open,
    () => emit('saved')
  )
watch([error, fields], async () => {
  if (!error.value) return
  await nextTick()
  const invalid = formRoot.value?.querySelector<HTMLElement>('[aria-invalid="true"]')
  const target = invalid || errorAnchor.value
  target?.scrollIntoView({ block: 'center' })
  target?.focus({ preventScroll: true })
})
</script>

<template>
  <UiAppModal
    v-model:open="open"
    :title="
      archived
        ? 'Arşivlenmiş kampanya'
        : advertisementId
          ? 'Kampanyayı düzenle'
          : 'Yeni reklam kampanyası'
    "
    description="Sponsorlu gönderinin içeriğini, bağlantısını ve yayın planını yönetin."
    :busy="saving || Boolean(draft && !archived)"
    size="wide"
  >
    <div
      v-if="loading"
      role="status"
      class="space-y-4"
    >
      <USkeleton
        v-for="index in 5"
        :key="index"
        class="h-12 w-full"
      />
    </div>
    <div
      v-else
      ref="formRoot"
      class="space-y-6"
    >
      <div
        v-if="error"
        ref="errorAnchor"
        tabindex="-1"
      >
        <UiAppAlert
          title="İşlem tamamlanamadı"
          :description="error"
        >
          <template #actions>
            <UiAppButton
              v-if="conflict || !draft"
              :label="conflict ? 'Değişiklikleri bırak ve günceli yükle' : 'Tekrar dene'"
              color="neutral"
              variant="outline"
              @click="load"
            />
          </template>
        </UiAppAlert>
      </div>
      <template v-if="draft">
        <UiAppAlert
          v-if="archived"
          title="Bu reklam arşivlendi"
          description="Reklam yayında değildir. Görsel ve raporları korunur; arşiv kaydı düzenlenemez."
          color="info"
        />
        <UiAppImageUpload
          v-model="image"
          label="Reklam görseli"
          :current-src="
            detail ? `/api/media/advertisements/${detail.id}/${detail.image.id}` : undefined
          "
          :error="fields.image?.[0]"
          :disabled="saving || archived || conflict"
          :required="!advertisementId"
        />
        <AdvertisementsEditorFields
          v-model="draft"
          :errors="fields"
          :disabled="saving || archived || conflict"
        />
      </template>
    </div>
    <template #footer>
      <UiAppButton
        :label="archived ? 'Kapat' : 'Vazgeç'"
        color="neutral"
        variant="outline"
        :disabled="saving"
        @click="open = false"
      />
      <UiAppButton
        v-if="draft && !archived"
        :label="advertisementId ? 'Değişiklikleri kaydet' : 'Kampanyayı oluştur'"
        icon="i-lucide-save"
        :loading="saving"
        :disabled="conflict"
        @click="save"
      />
    </template>
  </UiAppModal>
</template>

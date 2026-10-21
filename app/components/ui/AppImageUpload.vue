<script setup lang="ts">
import { adImageError } from '#shared/utils/advertisements'

const props = defineProps<{
  label: string
  currentSrc?: string
  error?: string
  disabled?: boolean
  required?: boolean
}>()
const file = defineModel<File | null>({ default: null })
const input = ref<HTMLInputElement | null>(null)
const localError = ref('')
const objectUrl = ref('')
watch(file, (value) => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = value ? URL.createObjectURL(value) : ''
  localError.value = ''
})
onBeforeUnmount(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})
function select(event: Event) {
  const element = event.target as HTMLInputElement
  const value = element.files?.[0] || null
  localError.value = adImageError(value)
  if (!localError.value) file.value = value
  element.value = ''
}
const photos = computed(() =>
  objectUrl.value || props.currentSrc
    ? [
        {
          id: objectUrl.value || props.currentSrc || '',
          src: objectUrl.value || props.currentSrc || '',
          label: props.label
        }
      ]
    : []
)
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm font-medium text-highlighted">
      {{ label }}{{ required ? ' *' : '' }}
    </p>
    <UiAppImageGallery
      v-if="photos.length"
      :images="photos"
      :label="label"
    />
    <div class="flex flex-wrap items-center gap-3">
      <input
        ref="input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        :aria-label="label"
        class="sr-only"
        :disabled="disabled"
        tabindex="-1"
        @change="select"
      >
      <UiAppButton
        :label="photos.length ? 'Görseli değiştir' : 'Görsel seç'"
        icon="i-lucide-image-plus"
        variant="outline"
        :disabled="disabled"
        @click="input?.click()"
      />
      <UiAppButton
        v-if="file"
        label="Seçimi kaldır"
        color="neutral"
        variant="ghost"
        :disabled="disabled"
        @click="file = null"
      />
      <span class="text-xs text-muted">JPG, PNG veya WebP · En fazla 10 MB</span>
    </div>
    <p
      v-if="localError || error"
      role="alert"
      class="text-sm text-error"
    >
      {{ localError || error }}
    </p>
  </div>
</template>

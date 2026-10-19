<script setup lang="ts">
defineProps<{ busy?: boolean, error?: string, fieldError?: string }>()
const open = defineModel<boolean>('open', { default: false })
const note = defineModel<string>('note', { default: '' })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UiAppModal
    v-model:open="open"
    title="Tarifi reddet"
    description="Tarifi paylaşan kişinin düzeltebilmesi için reddetme nedenini açıklayın."
    :busy="busy"
  >
    <div class="space-y-4">
      <UiAppAlert
        v-if="error"
        title="İşlem tamamlanamadı"
        :description="error"
      />
      <UiAppTextarea
        v-model="note"
        label="Reddetme nedeni"
        name="review_note"
        required
        :maxlength="2000"
        :disabled="busy"
        :error="fieldError"
        placeholder="Düzeltilmesi gerekenleri yazın…"
      />
    </div>
    <template #footer>
      <UiAppButton
        label="Vazgeç"
        color="neutral"
        variant="outline"
        :disabled="busy"
        @click="open = false"
      />
      <UiAppButton
        label="Tarifi reddet"
        color="error"
        :loading="busy"
        @click="emit('confirm')"
      />
    </template>
  </UiAppModal>
</template>

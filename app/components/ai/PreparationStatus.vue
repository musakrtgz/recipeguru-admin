<script setup lang="ts">
import type { AiPublication } from '#shared/utils/aiPublications'

const props = defineProps<{ publication: AiPublication }>()
const title = computed(() => !props.publication.draft
  ? 'Tarif hazırlanıyor'
  : !props.publication.ai_review
      ? 'Tarif kontrol ediliyor'
      : 'Kapak fotoğrafı hazırlanıyor')
</script>

<template>
  <UiAppAlert
    v-if="['planned', 'generating'].includes(publication.status)"
    :title="title"
    :description="publication.manual_preparation
      ? 'Tarif, kontrol ve kapak birkaç dakika sürebilir. Durum otomatik güncellenir; tamamlandığında tarif onayınızı bekler.'
      : 'Tamamlanan aşamalar korunur. Hazırlık durumu otomatik güncellenir.'"
    color="info"
    icon="i-lucide-sparkles"
  />
</template>

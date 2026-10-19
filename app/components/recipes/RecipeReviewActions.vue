<script setup lang="ts">
import type { RecipeStatus } from '#shared/types/api'

defineProps<{ status: RecipeStatus, loading?: boolean, disabled?: boolean }>()
const emit = defineEmits<{ review: [status: RecipeStatus], reject: [] }>()
</script>

<template>
  <UiAppButton
    v-if="status === 'approved'"
    label="Yayından kaldır"
    icon="i-lucide-pause-circle"
    color="warning"
    variant="soft"
    :loading="loading"
    :disabled="disabled"
    @click="emit('review', 'pending')"
  />
  <UiAppButton
    v-if="status === 'rejected'"
    label="Yeniden incelemeye al"
    icon="i-lucide-rotate-ccw"
    color="neutral"
    variant="outline"
    :loading="loading"
    :disabled="disabled"
    @click="emit('review', 'pending')"
  />
  <UiAppButton
    v-if="status !== 'rejected'"
    label="Reddet"
    icon="i-lucide-circle-x"
    color="error"
    variant="soft"
    :disabled="disabled || loading"
    @click="emit('reject')"
  />
  <UiAppButton
    v-if="status !== 'approved'"
    label="Onayla ve yayınla"
    icon="i-lucide-check"
    :loading="loading"
    :disabled="disabled"
    @click="emit('review', 'approved')"
  />
</template>

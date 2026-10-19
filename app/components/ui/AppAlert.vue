<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    color?: 'error' | 'warning' | 'success' | 'info'
    icon?: string
  }>(),
  { color: 'error', icon: 'i-lucide-circle-alert' }
)
</script>

<template>
  <UAlert
    :title="title"
    :description="description"
    :color="color"
    :icon="icon"
    variant="subtle"
    :ui="{ root: 'rounded-xl' }"
  >
    <template
      v-if="$slots.actions"
      #actions
    >
      <slot name="actions" />
    </template>
  </UAlert>
</template>

<script setup lang="ts">
defineProps<{
  color?: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
  dot?: boolean
}>()
</script>

<template>
  <UBadge
    :color="color || 'neutral'"
    variant="subtle"
    class="rounded-lg px-2.5 py-1 text-xs font-medium"
  >
    <span
      v-if="dot"
      class="mr-1.5 size-1.5 rounded-full bg-current"
    /><slot />
  </UBadge>
</template>

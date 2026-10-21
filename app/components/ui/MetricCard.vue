<script setup lang="ts">
defineProps<{ label: string, value: string | number, caption?: string }>()
</script>

<template>
  <UiAppCard>
    <p class="text-xs font-medium text-muted">
      {{ label }}
    </p>
    <p class="mt-3 text-2xl font-semibold tracking-tight text-highlighted">
      {{ value }}
    </p>
    <p
      v-if="caption"
      class="mt-2 text-xs text-dimmed"
    >
      {{ caption }}
    </p>
  </UiAppCard>
</template>

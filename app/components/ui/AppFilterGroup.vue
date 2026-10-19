<script setup lang="ts">
defineProps<{ label: string, items: { label: string, value: string }[] }>()
const value = defineModel<string>({ required: true })
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="flex flex-wrap gap-2"
  >
    <UiAppButton
      v-for="item in items"
      :key="item.value"
      :label="item.label"
      :aria-pressed="value === item.value"
      :variant="value === item.value ? 'solid' : 'outline'"
      :color="value === item.value ? 'primary' : 'neutral'"
      size="sm"
      @click="value = item.value"
    />
  </div>
</template>

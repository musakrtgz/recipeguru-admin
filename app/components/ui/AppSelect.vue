<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ label: string, items: { label: string, value: string }[] }>()
const model = defineModel<string>()
</script>

<template>
  <USelect
    v-model="model"
    v-bind="$attrs"
    :items="items"
    :aria-label="label"
  />
</template>

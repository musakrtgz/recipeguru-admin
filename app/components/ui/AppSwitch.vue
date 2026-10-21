<script setup lang="ts">
defineProps<{ label: string, description?: string, disabled?: boolean }>()
const value = defineModel<boolean>({ required: true })
</script>

<template>
  <USwitch
    v-model="value"
    :label="label"
    :description="description"
    :disabled="disabled"
  />
</template>

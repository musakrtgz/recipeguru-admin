<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{
  label: string
  name: string
  error?: string
  required?: boolean
}>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <UFormField
    :label="label"
    :name="name"
    :error="error || undefined"
    :required="required"
  >
    <UTextarea
      v-model="model"
      v-bind="$attrs"
      :name="name"
      :aria-required="required"
      class="w-full"
      :rows="4"
      :ui="{ base: 'rounded-xl' }"
    />
  </UFormField>
</template>

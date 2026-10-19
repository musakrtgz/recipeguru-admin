<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{
  label: string
  name: string
  error?: string
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number'
  icon?: string
  required?: boolean
}>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <UFormField
    :label="label"
    :name="name"
    :error="error"
    :required="required"
    class="w-full"
  >
    <UInput
      :id="name"
      v-model="model"
      v-bind="$attrs"
      :name="name"
      :type="type || 'text'"
      :icon="icon"
      :placeholder="placeholder"
      :aria-required="required"
      class="w-full"
    >
      <template
        v-if="$slots.trailing"
        #trailing
      >
        <slot name="trailing" />
      </template>
    </UInput>
  </UFormField>
</template>

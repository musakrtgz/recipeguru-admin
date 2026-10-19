<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

defineOptions({ inheritAttrs: false })
defineProps<
  Pick<
    ButtonProps,
    | 'label'
    | 'icon'
    | 'trailingIcon'
    | 'to'
    | 'type'
    | 'loading'
    | 'disabled'
    | 'color'
    | 'variant'
    | 'size'
    | 'block'
  >
>()
</script>

<template>
  <UButton v-bind="{ ...$attrs, ...$props }">
    <slot>{{ label }}</slot>
  </UButton>
</template>

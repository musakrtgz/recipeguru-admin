<script setup lang="ts">
defineProps<{ title: string, description?: string, busy?: boolean, size?: 'default' | 'wide' }>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :dismissible="!busy"
    :close="!busy"
    :ui="{ content: size === 'wide' ? 'sm:max-w-4xl' : 'sm:max-w-2xl' }"
  >
    <template #body>
      <slot />
    </template>
    <template
      v-if="$slots.footer"
      #footer
    >
      <div class="flex w-full flex-wrap justify-end gap-3">
        <slot name="footer" />
      </div>
    </template>
  </UModal>
</template>

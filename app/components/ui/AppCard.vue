<script setup lang="ts">
withDefaults(defineProps<{ title?: string, description?: string, padded?: boolean }>(), {
  padded: true
})
</script>

<template>
  <UCard :ui="{ body: padded === false ? 'p-0 sm:p-0' : 'p-5 sm:p-6' }">
    <template
      v-if="title || $slots.actions"
      #header
    >
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-base font-semibold text-highlighted">
            {{ title }}
          </h2>
          <p
            v-if="description"
            class="mt-1 text-sm text-muted"
          >
            {{ description }}
          </p>
        </div>
        <slot name="actions" />
      </div>
    </template>
    <slot />
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </UCard>
</template>

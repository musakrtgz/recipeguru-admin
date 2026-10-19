<script setup lang="ts">
withDefaults(defineProps<{ title: string, description?: string, icon?: string }>(), {
  icon: 'i-lucide-inbox'
})
</script>

<template>
  <div class="flex flex-col items-center px-6 py-12 text-center">
    <div class="brand-soft mb-4 flex size-12 items-center justify-center rounded-2xl">
      <UIcon
        :name="icon"
        class="brand-ink size-6"
      />
    </div>
    <h3 class="font-semibold text-highlighted">
      {{ title }}
    </h3>
    <p
      v-if="description"
      class="mt-2 max-w-sm text-sm text-muted"
    >
      {{ description }}
    </p>
    <div
      v-if="$slots.default"
      class="mt-5"
    >
      <slot />
    </div>
  </div>
</template>

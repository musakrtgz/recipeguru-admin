<script setup lang="ts">
defineProps<{
  label: string
  value?: number | null
  icon: string
  caption: string
  loading?: boolean
  featured?: boolean
}>()
</script>

<template>
  <UiAppCard
    class="card-hover"
    :class="{ 'border-primary/30': featured }"
  >
    <div class="mb-6 flex items-center justify-between">
      <p class="text-sm font-medium text-muted">
        {{ label }}
      </p>
      <div class="brand-soft flex size-10 items-center justify-center rounded-xl">
        <UIcon
          :name="icon"
          class="brand-ink size-5"
        />
      </div>
    </div>
    <USkeleton
      v-if="loading"
      class="h-9 w-24"
    />
    <p
      v-else
      class="text-3xl font-semibold tracking-tight text-highlighted"
    >
      {{ formatNumber(value) }}
    </p>
    <p class="mt-3 flex items-center gap-1.5 text-xs text-dimmed">
      <UIcon
        name="i-lucide-dot"
        class="size-3 text-primary"
      />{{ caption }}
    </p>
  </UiAppCard>
</template>

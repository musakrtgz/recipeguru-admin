<script setup lang="ts">
defineProps<{ eyebrow?: string, title: string, description?: string }>()
</script>

<template>
  <div class="mb-7 flex flex-wrap items-end justify-between gap-5">
    <div>
      <p
        v-if="eyebrow"
        class="brand-ink mb-2 text-[10px] font-semibold tracking-[.18em] uppercase"
      >
        {{ eyebrow }}
      </p>
      <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-2 text-sm leading-6 text-muted"
      >
        {{ description }}
      </p>
    </div>
    <slot />
  </div>
</template>

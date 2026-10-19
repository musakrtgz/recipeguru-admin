<script setup lang="ts">
import { adminConfig } from '#shared/config/admin'

defineProps<{ compact?: boolean }>()
</script>

<template>
  <div class="flex items-center gap-3">
    <div
      class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-inverted"
    >
      <svg
        viewBox="0 0 40 40"
        class="size-7"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M11 8v10m8-10v10m-4-10v24m-7-18c0 11 14 11 14 0m9-6c-8 4-8 14-2 16v8m2-24v24"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
        />
      </svg>
    </div>
    <div v-if="!compact">
      <p class="text-xl leading-tight font-bold tracking-tight text-highlighted">
        {{ adminConfig.brand.name }}
      </p>
      <p class="mt-0.5 text-[10px] font-semibold tracking-[.18em] text-muted uppercase">
        {{ adminConfig.brand.panelName }}
      </p>
    </div>
  </div>
</template>

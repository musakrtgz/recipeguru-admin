<script setup lang="ts">
import type { RecipeContentSection } from '#shared/types/catalog'

defineProps<{ sections: RecipeContentSection[] }>()
</script>

<template>
  <section
    v-for="(section, index) in sections"
    :key="index"
  >
    <h3 class="mb-4 flex items-center gap-2 font-semibold text-highlighted">
      <UIcon
        name="i-lucide-notebook-pen"
        class="size-4 text-primary"
      />{{ section.title }}
    </h3>
    <ol class="space-y-4">
      <li
        v-for="(line, lineIndex) in section.items"
        :key="lineIndex"
        class="flex items-start gap-3"
      >
        <span
          class="brand-soft flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-primary"
        >{{ lineIndex + 1 }}</span>
        <p class="pt-0.5 text-sm leading-7 whitespace-pre-wrap text-muted">
          {{ line }}
        </p>
      </li>
    </ol>
  </section>
</template>

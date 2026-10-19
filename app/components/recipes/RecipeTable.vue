<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { SubmittedRecipe } from '#shared/types/api'

defineProps<{ recipes: SubmittedRecipe[], loading?: boolean }>()
const emit = defineEmits<{ reviewed: [] }>()
const selected = ref<SubmittedRecipe | null>(null)
const open = ref(false)
const columns: TableColumn<SubmittedRecipe>[] = [
  { accessorKey: 'title', header: 'Tarif' },
  { id: 'author', header: 'Paylaşan' },
  { accessorKey: 'status', header: 'Durum' },
  { accessorKey: 'submitted_at', header: 'Tarih' },
  { id: 'action', header: '' }
]
function select(recipe: SubmittedRecipe) {
  selected.value = recipe
  open.value = true
}
</script>

<template>
  <UiAppTable
    :data="recipes"
    :columns="columns"
    :loading="loading"
  >
    <template #title-cell="{ row }">
      <button
        class="flex max-w-64 items-center gap-3 text-left font-medium hover:text-primary"
        @click="select(row.original)"
      >
        <span class="brand-soft flex size-10 shrink-0 items-center justify-center rounded-xl"><UIcon
          name="i-lucide-cooking-pot"
          class="brand-ink size-5"
        /></span><span class="truncate">{{ row.original.title }}</span>
      </button>
    </template>
    <template #author-cell="{ row }">
      <span class="text-muted">{{
        row.original.author
          ? [row.original.author.name, row.original.author.surname].filter(Boolean).join(' ')
          : 'Silinmiş kullanıcı'
      }}</span>
    </template>
    <template #status-cell="{ row }">
      <UiAppBadge
        :color="
          row.original.status === 'pending'
            ? 'warning'
            : row.original.status === 'approved'
              ? 'success'
              : 'error'
        "
        dot
      >
        {{
          row.original.status === 'pending'
            ? 'İncelemede'
            : row.original.status === 'approved'
              ? 'Yayında'
              : 'Reddedildi'
        }}
      </UiAppBadge>
    </template>
    <template #submitted_at-cell="{ row }">
      <span class="text-xs text-muted">{{ formatDate(row.original.submitted_at, true) }}</span>
    </template>
    <template #action-cell="{ row }">
      <UiAppButton
        label="İncele"
        trailing-icon="i-lucide-arrow-up-right"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="select(row.original)"
      />
    </template>
    <template #empty>
      <UiAppEmptyState
        title="Burada her şey tamam."
        description="Bu durumdaki tarifler burada listelenir."
        icon="i-lucide-circle-check"
      />
    </template>
  </UiAppTable>
  <RecipesRecipeReviewModal
    v-model:open="open"
    :recipe="selected"
    @reviewed="emit('reviewed')"
  />
</template>

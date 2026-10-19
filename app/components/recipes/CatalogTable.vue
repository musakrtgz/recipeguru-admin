<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CatalogRecipe } from '#shared/types/catalog'
import { personRange } from '#shared/utils/catalog'

defineProps<{ recipes: CatalogRecipe[], loading?: boolean, filtered?: boolean }>()
defineEmits<{ reset: [] }>()
const selected = ref<CatalogRecipe | null>(null)
const detailOpen = ref(false)
function showDetail(recipe: CatalogRecipe) {
  selected.value = recipe
  detailOpen.value = true
}
const columns: TableColumn<CatalogRecipe>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: 'Tarif' },
  { accessorKey: 'locale', header: 'Dil' },
  { id: 'person', header: 'Porsiyon' },
  { accessorKey: 'cookingTime', header: 'Pişirme süresi' },
  { accessorKey: 'calories', header: 'Kalori' },
  { accessorKey: 'createdAt', header: 'Eklenme tarihi' },
  { id: 'action', header: '' }
]
</script>

<template>
  <UiAppTable
    :data="recipes"
    :columns="columns"
    :loading="loading"
  >
    <template #id-cell="{ row }">
      <span class="font-mono text-xs text-dimmed">#{{ row.original.id }}</span>
    </template>
    <template #title-cell="{ row }">
      <UiAppButton
        color="neutral"
        variant="link"
        class="flex min-w-60 max-w-96 items-center gap-3 p-0 text-left"
        :aria-label="(row.original.title || 'Tarif') + ' detayını görüntüle'"
        @click="showDetail(row.original)"
      >
        <span class="brand-soft flex size-10 shrink-0 items-center justify-center rounded-xl"><UIcon
          name="i-lucide-cooking-pot"
          class="brand-ink size-5"
        /></span>
        <div class="min-w-0">
          <p
            class="truncate font-medium text-highlighted"
            :title="row.original.title || undefined"
          >
            {{ row.original.title || 'Çeviri bulunamadı' }}
          </p>
          <p
            v-if="row.original.cooker || row.original.repast"
            class="mt-1 truncate text-xs text-muted"
          >
            {{ [row.original.repast, row.original.cooker].filter(Boolean).join(' · ') }}
          </p>
        </div>
      </UiAppButton>
    </template>
    <template #locale-cell="{ row }">
      <UiAppBadge
        v-if="row.original.locale"
        color="primary"
      >
        {{ row.original.locale.toUpperCase() }}
      </UiAppBadge><span
        v-else
        class="text-muted"
      >—</span>
    </template>
    <template #person-cell="{ row }">
      <span class="whitespace-nowrap text-muted">{{
        personRange(row.original.minPerson, row.original.maxPerson)
      }}</span>
    </template>
    <template #cookingTime-cell="{ row }">
      <span class="whitespace-nowrap text-muted">{{
        row.original.cookingTime == null ? '—' : row.original.cookingTime + ' dk'
      }}</span>
    </template>
    <template #calories-cell="{ row }">
      <span class="whitespace-nowrap text-muted">{{
        row.original.calories == null ? '—' : formatNumber(row.original.calories) + ' kcal'
      }}</span>
    </template>
    <template #createdAt-cell="{ row }">
      <span class="whitespace-nowrap text-xs text-muted">{{
        row.original.createdAt ? formatDate(row.original.createdAt, true) : '—'
      }}</span>
    </template>
    <template #action-cell="{ row }">
      <UiAppButton
        label="Detay"
        trailing-icon="i-lucide-arrow-up-right"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="showDetail(row.original)"
      />
    </template>
    <template #empty>
      <UiAppEmptyState
        :title="filtered ? 'Aramana uygun tarif bulunamadı.' : 'Henüz tarif eklenmemiş.'"
        :description="
          filtered
            ? 'Başka bir tarif adı dene veya filtreleri sıfırla.'
            : 'Uygulamada oluşturulan tarifler burada listelenecek.'
        "
        icon="i-lucide-notebook-text"
      >
        <UiAppButton
          v-if="filtered"
          label="Filtreleri sıfırla"
          color="neutral"
          variant="outline"
          @click="$emit('reset')"
        />
      </UiAppEmptyState>
    </template>
  </UiAppTable>
  <RecipesCatalogDetailModal
    v-model:open="detailOpen"
    :recipe="selected"
  />
</template>

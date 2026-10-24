<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AiPublication } from '#shared/utils/aiPublications'
import { aiStatusLabel, aiStatusColor, aiDate } from '#shared/utils/aiPublications'

defineProps<{ items: AiPublication[], loading?: boolean }>()
const emit = defineEmits<{ open: [id: number] }>()
const columns: TableColumn<AiPublication>[] = [
  { accessorKey: 'title', header: 'Tarif ve profil' },
  { accessorKey: 'status', header: 'Durum' },
  { accessorKey: 'scheduled_at', header: 'Yayın saati · İstanbul' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <UiAppTable
    :data="items"
    :columns="columns"
    :loading="loading"
    loading-label="AI yayınları yükleniyor"
    empty="Bu filtreyle eşleşen yayın planı yok."
  >
    <template #title-cell="{ row }">
      <div class="max-w-80 whitespace-normal">
        <p class="font-medium text-highlighted">
          {{ row.original.title || 'Tarif hazırlanacak' }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ row.original.author_name }} · {{ row.original.locale.toUpperCase() }}
        </p>
      </div>
    </template>
    <template #status-cell="{ row }">
      <UiAppBadge :color="aiStatusColor(row.original.status, row.original.review_passed)">
        {{
          aiStatusLabel(row.original.status, row.original.review_passed)
        }}
      </UiAppBadge>
      <p
        v-if="row.original.error_message"
        class="mt-2 max-w-64 text-xs whitespace-normal text-error"
      >
        {{ row.original.error_message }}
      </p>
    </template>
    <template #scheduled_at-cell="{ row }">
      <span class="text-xs">{{ row.original.published_at ? aiDate(row.original.published_at) : row.original.manual_preparation ? 'Admin onayıyla yayınlanır' : aiDate(row.original.scheduled_at) }}</span>
    </template>
    <template #actions-cell="{ row }">
      <UiAppButton
        label="İncele"
        icon="i-lucide-arrow-up-right"
        color="neutral"
        variant="outline"
        @click="emit('open', row.original.id)"
      />
    </template>
  </UiAppTable>
</template>

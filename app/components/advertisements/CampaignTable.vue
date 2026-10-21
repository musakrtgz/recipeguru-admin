<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Advertisement } from '#shared/types/advertisements'
import { adPhase, adTargetLabel, adPercent, adDate } from '#shared/utils/advertisements'

defineProps<{ items: Advertisement[], loading?: boolean, busyId: number | null }>()
const emit = defineEmits<{
  edit: [value: Advertisement]
  report: [value: Advertisement]
  toggle: [value: Advertisement]
  archive: [value: Advertisement]
}>()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 60000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
const columns: TableColumn<Advertisement>[] = [
  { id: 'campaign', header: 'Kampanya' },
  { id: 'status', header: 'Durum' },
  { id: 'schedule', header: 'Yayın aralığı (UTC)' },
  { id: 'performance', header: 'Performans' },
  { id: 'actions', header: 'İşlemler' }
]
</script>

<template>
  <UiAppTable
    :data="items"
    :columns="columns"
    :loading="loading"
    loading-label="Kampanyalar yükleniyor"
  >
    <template #campaign-cell="{ row }">
      <button
        type="button"
        class="max-w-60 text-left hover:text-primary"
        @click="emit('edit', row.original)"
      >
        <span class="block truncate font-semibold">{{ row.original.title }}</span><span class="mt-1 block text-xs text-muted">{{ row.original.sponsor_name }} · Sponsorlu</span><span class="mt-1 block text-xs text-dimmed">{{ adTargetLabel(row.original) }}</span>
      </button>
    </template>
    <template #status-cell="{ row }">
      <div class="space-y-2">
        <UiAppBadge
          :color="
            row.original.deleted_at ? 'neutral' : row.original.is_active ? 'success' : 'warning'
          "
        >
          {{ adPhase(row.original, now) }}
        </UiAppBadge>
        <p class="text-xs text-dimmed">
          {{ row.original.locale?.toUpperCase() || 'Tüm diller' }}
        </p>
      </div>
    </template>
    <template #schedule-cell="{ row }">
      <p class="text-xs text-muted">
        {{ adDate(row.original.starts_at) }}
      </p>
      <p class="mt-1 text-xs text-muted">
        {{ adDate(row.original.ends_at) }}
      </p>
    </template>
    <template #performance-cell="{ row }">
      <p class="text-sm font-medium">
        {{ formatNumber(row.original.impressions_count) }} gösterim
      </p>
      <p class="mt-1 text-xs text-muted">
        {{ formatNumber(row.original.clicks_count) }} tıklama ·
        {{ adPercent(row.original.ctr_percent) }} CTR
      </p>
    </template>
    <template #actions-cell="{ row }">
      <div class="flex items-center gap-1">
        <UiAppButton
          :label="row.original.deleted_at ? 'Görüntüle' : 'Düzenle'"
          size="sm"
          variant="ghost"
          color="neutral"
          :disabled="Boolean(busyId)"
          @click="emit('edit', row.original)"
        />
        <UiAppButton
          label="Rapor"
          icon="i-lucide-chart-no-axes-combined"
          size="sm"
          variant="soft"
          :disabled="Boolean(busyId)"
          @click="emit('report', row.original)"
        />
        <UiAppButton
          v-if="!row.original.deleted_at"
          :label="row.original.is_active ? 'Durdur' : 'Etkinleştir'"
          size="sm"
          variant="ghost"
          color="neutral"
          :loading="busyId === row.original.id"
          :disabled="Boolean(busyId)"
          @click="emit('toggle', row.original)"
        />
        <UiAppButton
          v-if="!row.original.deleted_at"
          icon="i-lucide-archive"
          :aria-label="row.original.title + ' kampanyasını arşivle'"
          size="sm"
          variant="ghost"
          color="error"
          :disabled="Boolean(busyId)"
          @click="emit('archive', row.original)"
        />
      </div>
    </template>
    <template #empty>
      <UiAppEmptyState
        title="Kampanya bulunamadı"
        description="Filtreleri değiştirin veya ilk reklam kampanyanızı oluşturun."
        icon="i-lucide-megaphone"
      />
    </template>
  </UiAppTable>
</template>

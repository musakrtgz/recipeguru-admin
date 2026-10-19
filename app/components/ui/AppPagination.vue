<script setup lang="ts">
defineProps<{ total: number, pageSize: number, loading?: boolean, pageSizeOptions?: boolean }>()
const page = defineModel<number>('page', { default: 1 })
const emit = defineEmits<{ 'update:pageSize': [value: number] }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <span class="text-xs text-muted">{{ total ? formatNumber((page - 1) * pageSize + 1) : '0' }}–{{
      formatNumber(Math.min(page * pageSize, total))
    }}
      / {{ formatNumber(total) }} tarif</span>
    <div class="flex flex-wrap items-center gap-4">
      <UiAppSelect
        v-if="pageSizeOptions"
        :model-value="String(pageSize)"
        label="Sayfa başına tarif sayısı"
        :items="[
          { label: '10 / sayfa', value: '10' },
          { label: '25 / sayfa', value: '25' },
          { label: '50 / sayfa', value: '50' }
        ]"
        :disabled="loading"
        @update:model-value="emit('update:pageSize', Number($event))"
      />
      <UPagination
        v-if="total > pageSize"
        v-model:page="page"
        :total="total"
        :items-per-page="pageSize"
        :sibling-count="1"
        :disabled="loading"
        show-edges
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import type { TableColumn } from '@nuxt/ui'

defineProps<{
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  loadingLabel?: string
  empty?: string
}>()
</script>

<template>
  <UTable
    :data="data"
    :columns="columns"
    :loading="loading"
    :empty="empty || 'Gösterilecek kayıt bulunmuyor.'"
    class="w-full"
  >
    <template
      v-for="name in Object.keys($slots).filter(name => name !== 'empty')"
      #[name]="scope"
    >
      <slot
        :name="name"
        v-bind="scope"
      />
    </template>
    <template #empty>
      <div
        v-if="loading"
        class="space-y-4 p-6"
        role="status"
        :aria-label="loadingLabel || 'Tarifler yükleniyor'"
      >
        <USkeleton
          v-for="index in 4"
          :key="index"
          class="h-9 w-full"
        />
      </div>
      <slot
        v-else
        name="empty"
      >
        {{ empty || 'Gösterilecek kayıt bulunmuyor.' }}
      </slot>
    </template>
  </UTable>
</template>

<script setup lang="ts">
import type { RecipePage } from '#shared/types/api'
import { adminConfig } from '#shared/config/admin'

useSeoMeta({ title: 'Tarif incelemeleri' })
const api = useApi()
const filter = ref('all')
const page = ref(1)
watch(filter, () => {
  page.value = 1
})
const key = computed(() => `recipes-${filter.value}-${page.value}`)
const { data, status, error, refresh } = await useAsyncData(key, () =>
  api.request<RecipePage>(
    '/recipes',
    { params: { page: page.value, status: filter.value } },
    { error: false }
  )
)
watch(data, (value) => {
  if (value && page.value > value.lastPage) page.value = Math.max(1, value.lastPage)
})
const filters = [
  { label: 'Tüm tarifler', value: 'all' },
  { label: 'İnceleme bekleyenler', value: 'pending' },
  { label: 'Yayında', value: 'approved' },
  { label: 'Reddedilenler', value: 'rejected' }
]
</script>

<template>
  <div>
    <LayoutPageHeading
      eyebrow="Topluluk"
      title="Tarif incelemeleri"
      description="Her paylaşım, özenli bir değerlendirmeyi hak eder."
    >
      <UiAppButton
        label="Güncelle"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        :loading="status === 'pending'"
        @click="refresh()"
      />
    </LayoutPageHeading>
    <UiAppCard
      title="Topluluk tarifleri"
      :padded="false"
    >
      <template #default>
        <div class="border-b border-default p-5 sm:px-6">
          <UiAppFilterGroup
            v-model="filter"
            label="Tarif durumu"
            :items="filters"
          />
        </div>
        <div
          v-if="error"
          class="p-6"
        >
          <UiAppAlert
            title="Tarifler yüklenemedi"
            description="Lütfen tekrar deneyin."
          />
        </div>
        <RecipesRecipeTable
          v-else
          :recipes="data?.items || []"
          :loading="status === 'pending'"
          @reviewed="refresh()"
        />
      </template>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <span class="text-xs text-muted">{{ formatNumber(data?.total) }} tarif</span><UPagination
            v-if="data && data.lastPage > 1"
            v-model:page="page"
            :total="data.total"
            :items-per-page="adminConfig.pagination.pageSize"
            :sibling-count="1"
            show-edges
          />
        </div>
      </template>
    </UiAppCard>
  </div>
</template>

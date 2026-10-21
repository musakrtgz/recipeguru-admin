<script setup lang="ts">
import axios from 'axios'
import type { TableColumn } from '@nuxt/ui'
import type { Advertisement, AdvertisementReport } from '#shared/types/advertisements'
import type { ApiFailure } from '#shared/types/api'
import { adReportQuerySchema, reportDates, adPercent } from '#shared/utils/advertisements'

const props = defineProps<{ advertisement: Advertisement | null }>()
const open = defineModel<boolean>('open', { default: false })
const api = useApi()
const range = ref(reportDates())
const report = ref<AdvertisementReport | null>(null)
const loading = ref(false)
const error = ref('')
const fields = ref<Record<string, string[]>>({})
const dailyPage = ref(1)
let sequence = 0
let controller: AbortController | undefined
const rows = computed(
  () => report.value?.daily.slice((dailyPage.value - 1) * 10, dailyPage.value * 10) || []
)
const columns: TableColumn<{ date: string, impressions: number, clicks: number }>[] = [
  { accessorKey: 'date', header: 'Gün' },
  { accessorKey: 'impressions', header: 'Gösterim' },
  { accessorKey: 'clicks', header: 'Tıklama' }
]
async function load() {
  if (!props.advertisement) return
  const parsed = adReportQuerySchema.safeParse(range.value)
  fields.value = parsed.success ? {} : parsed.error.flatten().fieldErrors
  if (!parsed.success) return
  controller?.abort()
  controller = new AbortController()
  const current = ++sequence
  loading.value = true
  report.value = null
  error.value = ''
  try {
    const data = await api.request<AdvertisementReport>(
      `/advertisements/${props.advertisement.id}/report`,
      { params: parsed.data, signal: controller.signal },
      { error: false }
    )
    if (sequence === current && open.value) {
      report.value = data
      dailyPage.value = 1
    }
  } catch (failure) {
    if (sequence === current && !axios.isCancel(failure))
      error.value = (failure as ApiFailure).message
  } finally {
    if (sequence === current) loading.value = false
  }
}
function preset(days: number) {
  range.value = reportDates(days)
  void load()
}
watch([open, () => props.advertisement?.id], () => {
  if (open.value) {
    range.value = reportDates()
    void load()
  } else {
    sequence++
    controller?.abort()
    report.value = null
    loading.value = false
  }
})
onBeforeUnmount(() => {
  sequence++
  controller?.abort()
})
</script>

<template>
  <UiAppModal
    v-model:open="open"
    :title="(advertisement?.title || 'Kampanya') + ' · Rapor'"
    description="Gerçek gösterim ve tıklama kayıtlarını tarih aralığına göre inceleyin."
    size="wide"
  >
    <div class="space-y-6">
      <form
        class="space-y-4"
        @submit.prevent="load"
      >
        <div class="grid items-end gap-3 sm:grid-cols-3">
          <UiAppInput
            v-model="range.from"
            label="Başlangıç günü (UTC)"
            name="from"
            type="date"
            required
            :error="fields.from?.[0]"
          /><UiAppInput
            v-model="range.to"
            label="Bitiş günü (UTC)"
            name="to"
            type="date"
            required
            :error="fields.to?.[0]"
          /><UiAppButton
            label="Raporu getir"
            icon="i-lucide-chart-no-axes-combined"
            type="submit"
            :loading="loading"
          />
        </div>
        <div class="flex gap-2">
          <UiAppButton
            label="Son 7 gün"
            variant="outline"
            color="neutral"
            size="sm"
            @click="preset(7)"
          /><UiAppButton
            label="Son 30 gün"
            variant="outline"
            color="neutral"
            size="sm"
            @click="preset(30)"
          />
        </div>
      </form>
      <UiAppAlert
        v-if="error"
        title="Rapor yüklenemedi"
        :description="error"
      >
        <template #actions>
          <UiAppButton
            label="Tekrar dene"
            variant="outline"
            color="neutral"
            @click="load"
          />
        </template>
      </UiAppAlert>
      <div
        v-else-if="loading"
        class="grid grid-cols-2 gap-3"
        role="status"
      >
        <USkeleton
          v-for="index in 4"
          :key="index"
          class="h-24 w-full"
        />
      </div>
      <template v-else-if="report">
        <p class="text-xs text-muted">
          {{ report.from }} – {{ report.to }} · Saat dilimi: {{ report.timezone }}
        </p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <UiMetricCard
            label="Gösterim"
            :value="formatNumber(report.impressions)"
          /><UiMetricCard
            label="Tıklama"
            :value="formatNumber(report.clicks)"
          /><UiMetricCard
            label="Tekil izleyici"
            :value="formatNumber(report.unique_viewers)"
          /><UiMetricCard
            label="Tıklama oranı"
            :value="adPercent(report.ctr_percent)"
            caption="Gösterime bağlı CTR"
          />
        </div>
        <UiAppAlert
          v-if="report.impressions === 0 && report.clicks === 0"
          title="Bu aralıkta etkinlik kaydı yok"
          description="Tarih aralığını genişletebilir veya kampanyanın yayın ayarlarını kontrol edebilirsiniz."
          color="info"
        />
        <UiDailyBarChart
          v-else
          :items="report.daily"
        />
        <section>
          <h3 class="mb-3 font-semibold">
            Günlük dağılım
          </h3>
          <UiAppTable
            :data="rows"
            :columns="columns"
          /><UiAppPagination
            v-model:page="dailyPage"
            :total="report.daily.length"
            :page-size="10"
            item-label="gün"
          />
        </section>
        <p class="border-t border-default pt-4 text-xs leading-6 text-muted">
          Tüm zamanlar: {{ formatNumber(report.lifetime.impressions) }} gösterim ·
          {{ formatNumber(report.lifetime.clicks) }} tıklama. CTR, bu aralıktaki gösterimlere ait
          tıklamalarla hesaplanır; günlük tıklamalar gerçekleştiği güne yazılır. Bu rapor satış veya
          dönüşüm sayısı değildir.
        </p>
      </template>
    </div>
    <template #footer>
      <UiAppButton
        label="Kapat"
        color="neutral"
        variant="outline"
        @click="open = false"
      />
    </template>
  </UiAppModal>
</template>

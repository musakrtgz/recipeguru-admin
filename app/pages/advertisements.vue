<script setup lang="ts">
import type { Advertisement } from '#shared/types/advertisements'
import { adTypes, adStatuses } from '#shared/utils/advertisements'

useSeoMeta({ title: 'Reklam kampanyaları' })
const {
  query,
  search,
  statusFilter,
  typeFilter,
  page,
  pageSize,
  list,
  settings,
  busyId,
  archiveTarget,
  archiveOpen,
  submitSearch,
  reset,
  toggle,
  confirmArchive,
  archive
} = useAdvertisements()
const { data, status, error, refresh } = list
const {
  data: settingsData,
  status: settingsStatus,
  error: settingsError,
  refresh: refreshSettings
} = settings
const editorOpen = ref(false)
const selectedId = ref<number | null>(null)
const reportOpen = ref(false)
const reportTarget = ref<Advertisement | null>(null)
function create() {
  selectedId.value = null
  editorOpen.value = true
}
function edit(ad: Advertisement) {
  selectedId.value = ad.id
  editorOpen.value = true
}
function report(ad: Advertisement) {
  reportTarget.value = ad
  reportOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <LayoutPageHeading
      eyebrow="Sponsorlu içerikler"
      title="Reklam kampanyaları"
      description="Tariflerinize ve markalara görünürlük kazandırın; yayınları ve sonuçlarını tek yerden yönetin."
    >
      <div class="flex flex-wrap gap-3">
        <UiAppButton
          label="Güncelle"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="status === 'pending'"
          @click="refresh()"
        /><UiAppButton
          label="Yeni kampanya"
          icon="i-lucide-plus"
          @click="create"
        />
      </div>
    </LayoutPageHeading>
    <AdvertisementsSettingsCard
      :settings="settingsData || null"
      :loading="settingsStatus === 'pending'"
      :failed="Boolean(settingsError)"
      @saved="refreshSettings()"
      @retry="refreshSettings()"
    />
    <UiAppCard
      title="Kampanyalar"
      description="Hazır tarifler, kullanıcı tarifleri ve harici bağlantılar"
      :padded="false"
    >
      <template #actions>
        <UiAppBadge
          v-if="data && status !== 'pending'"
          color="primary"
        >
          {{ formatNumber(data.total) }} kampanya
        </UiAppBadge>
      </template>
      <div class="space-y-4 border-b border-default p-5 sm:p-6">
        <UiAppFilterGroup
          v-model="statusFilter"
          label="Kampanya durumu"
          :items="adStatuses"
        />
        <form
          class="flex flex-wrap items-end gap-3"
          @submit.prevent="submitSearch"
        >
          <div class="min-w-52 flex-1">
            <UiAppInput
              v-model="search"
              label="Kampanya veya sponsor ara"
              name="advertisement_search"
              placeholder="Başlık veya sponsor adı…"
              :maxlength="180"
            />
          </div>
          <UFormField
            label="Yönlendirme"
            name="destination_filter"
          >
            <UiAppSelect
              v-model="typeFilter"
              label="Yönlendirme filtresi"
              :items="[{ label: 'Tüm yönlendirmeler', value: 'all' }, ...adTypes]"
              class="w-52"
            />
          </UFormField><UiAppButton
            label="Ara"
            icon="i-lucide-search"
            type="submit"
            :loading="status === 'pending'"
          /><UiAppButton
            v-if="query.q || query.status !== 'all' || query.destination_type !== 'all'"
            label="Temizle"
            color="neutral"
            variant="ghost"
            @click="reset"
          />
        </form>
      </div>
      <div
        v-if="error"
        class="p-6"
      >
        <UiAppAlert
          title="Kampanyalar yüklenemedi"
          description="API bağlantısını kontrol edip tekrar deneyin."
        >
          <template #actions>
            <UiAppButton
              label="Tekrar dene"
              color="neutral"
              variant="outline"
              @click="refresh()"
            />
          </template>
        </UiAppAlert>
      </div>
      <AdvertisementsCampaignTable
        v-else
        :items="data?.items || []"
        :loading="status === 'pending'"
        :busy-id="busyId"
        @edit="edit"
        @report="report"
        @toggle="toggle"
        @archive="confirmArchive"
      />
      <template #footer>
        <UiAppPagination
          v-if="data && !error"
          v-model:page="page"
          :page-size="pageSize"
          :total="data.total"
          :loading="status === 'pending'"
          item-label="kampanya"
          page-size-options
          @update:page-size="pageSize = $event"
        />
        <p
          v-else
          class="text-xs text-muted"
        >
          {{ status === 'pending' ? 'Kampanyalar yükleniyor…' : 'Kampanya sayısı alınamadı.' }}
        </p>
      </template>
    </UiAppCard>
    <p class="text-xs leading-6 text-dimmed">
      Etkin durumu, kampanyanın açık olduğunu gösterir. Yayın tarihleri, toplam ve kullanıcı başına
      kotalar, kaynak tarifin görünürlüğü ve genel yayın anahtarı birlikte uygulanır.
    </p>
    <AdvertisementsEditorModal
      v-model:open="editorOpen"
      :advertisement-id="selectedId"
      @saved="refresh()"
    />
    <AdvertisementsReportModal
      v-model:open="reportOpen"
      :advertisement="reportTarget"
    />
    <UiAppModal
      v-model:open="archiveOpen"
      title="Kampanyayı arşivle"
      description="Arşivleme reklamı yayından kaldırır; görseli ve rapor geçmişini korur."
      :busy="Boolean(busyId)"
    >
      <p class="text-sm leading-7 text-muted">
        {{ archiveTarget?.title }} kampanyası arşivlenecek. Arşivlenmiş kampanya düzenlenemez. Daha
        sonra tekrar kullanmak istiyorsanız Durdur seçeneğini tercih edebilirsiniz.
      </p>
      <template #footer>
        <UiAppButton
          label="Vazgeç"
          color="neutral"
          variant="outline"
          :disabled="Boolean(busyId)"
          @click="archiveOpen = false"
        /><UiAppButton
          label="Arşivle"
          icon="i-lucide-archive"
          color="error"
          :loading="Boolean(busyId)"
          @click="archive"
        />
      </template>
    </UiAppModal>
  </div>
</template>

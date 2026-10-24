<script setup lang="ts">
import type { AiProfile } from '#shared/utils/aiPublications'
import { aiStatuses, aiMoney } from '#shared/utils/aiPublications'

useSeoMeta({ title: 'AI Yayınları' })
const { list, settings, profiles, filter, publisher, page, pageSize, refresh } = useAiPublications()
const { data, status, error } = list
const { data: settingsData, error: settingsError } = settings
const { data: profileData, error: profilesError } = profiles
const profileOpen = ref(false),
  planOpen = ref(false),
  prepareOpen = ref(false),
  detailOpen = ref(false)
const selectedProfile = ref<AiProfile | null>(null),
  selectedId = ref<number | null>(null),
  planProfileId = ref<number | null>(null)
function editProfile(value: AiProfile) {
  selectedProfile.value = value
  profileOpen.value = true
}
function openDetail(id: number) {
  selectedId.value = id
  detailOpen.value = true
}
function prepare(value?: AiProfile) {
  planProfileId.value = value?.id || null
  prepareOpen.value = true
}
function schedule() {
  planProfileId.value = null
  planOpen.value = true
}
async function prepared(id: number) {
  await refresh()
  openDetail(id)
}
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (
      document.visibilityState === 'visible'
      && !detailOpen.value
      && !profileOpen.value
      && !planOpen.value
      && !prepareOpen.value
    )
      void refresh()
  }, 15000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="space-y-6">
    <LayoutPageHeading
      eyebrow="Yedi mutfak, tek yayın masası"
      title="AI Yayınları"
      description="AI hesaplarının tariflerini hazırlayın, inceleyin ve doğru zamanda paylaşın."
    >
      <div class="flex flex-wrap gap-3">
        <UiAppButton
          label="Güncelle"
          icon="i-lucide-refresh-cw"
          variant="outline"
          color="neutral"
          :loading="status === 'pending'"
          @click="refresh"
        /><UiAppButton
          label="Yayın planla"
          icon="i-lucide-calendar-plus"
          variant="outline"
          color="neutral"
          :disabled="!settingsData?.enabled || !profileData?.some(item => item.available && item.enabled)"
          @click="schedule"
        /><UiAppButton
          label="Tarif hazırla"
          icon="i-lucide-sparkles"
          :disabled="!profileData?.some(item => item.available)"
          @click="prepare()"
        />
      </div>
    </LayoutPageHeading>
    <div
      v-if="settingsData"
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <UiMetricCard
        label="Bugünkü OpenAI istekleri"
        :value="settingsData.today.requests"
        :caption="settingsData.today.date + ' · İstanbul'"
      />
      <UiMetricCard
        label="Tahmini kullanım maliyeti"
        :value="aiMoney(settingsData.today.estimated_usd)"
        caption="OpenAI kullanım verisine göre tahmin"
      />
      <UiMetricCard
        label="Bütçeden sayılan toplam"
        :value="aiMoney(settingsData.today.charged_usd)"
        :caption="'Günlük limit ' + aiMoney(settingsData.daily_budget_usd)"
      />
      <UiMetricCard
        label="Maliyeti belirsiz / süren istek"
        :value="settingsData.today.unknown_requests"
        caption="Ayrılan bütçe payı korunur"
      />
    </div>
    <AiSettingsCard
      :settings="settingsData || null"
      :failed="Boolean(settingsError)"
      :loading="settings.status.value === 'pending' && !settingsData"
      @saved="settings.refresh()"
      @retry="settings.refresh()"
    />
    <UiAppCard
      title="Yayıncı profiller"
      description="Profil başına başlangıçta günde bir tarif. Yeni planlar 24 saat önceden hazırlanır."
    >
      <UiAppAlert
        v-if="profilesError"
        title="Yayıncılar yüklenemedi"
      >
        <template #actions>
          <UiAppButton
            label="Tekrar dene"
            variant="outline"
            @click="profiles.refresh()"
          />
        </template>
      </UiAppAlert>
      <div
        v-else-if="!profileData"
        role="status"
        aria-label="AI profilleri yükleniyor"
      >
        <USkeleton class="h-48 w-full" />
      </div>
      <div
        v-else
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <div
          v-for="profile in profileData"
          :key="profile.id"
          class="space-y-4 rounded-xl border border-default bg-muted/30 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-highlighted">
                {{ profile.name }}
              </h3>
              <p class="mt-1 text-xs text-muted">
                {{ profile.type_label }}
              </p>
            </div>
            <UiAppBadge color="primary">
              AI
            </UiAppBadge>
          </div>
          <p class="text-sm text-muted">
            {{ profile.times.join(' · ') }} · İstanbul · {{ profile.locale.toUpperCase() }}
          </p>
          <UiAppBadge :color="profile.available && profile.enabled ? 'success' : 'neutral'">
            {{
              !profile.available
                ? 'Hesap görünür değil'
                : profile.enabled
                  ? 'Otomasyon açık'
                  : 'Duraklatıldı'
            }}
          </UiAppBadge>
          <div class="flex flex-wrap gap-2">
            <UiAppButton
              label="Tarif hazırla"
              icon="i-lucide-sparkles"
              :disabled="!profile.available"
              @click="prepare(profile)"
            /><UiAppButton
              label="Kuralları düzenle"
              icon="i-lucide-sliders-horizontal"
              variant="outline"
              color="neutral"
              @click="editProfile(profile)"
            /><UiAppButton
              label="Planları gör"
              variant="ghost"
              color="neutral"
              @click="publisher = String(profile.user_id)"
            />
          </div>
        </div>
      </div>
    </UiAppCard>
    <UiAppCard
      title="Yayın planları"
      description="Hazırlık, onay ve yayın durumunu birlikte izleyin."
      :padded="false"
    >
      <div class="flex flex-wrap items-end gap-4 border-b border-default p-5 sm:p-6">
        <div class="min-w-48 flex-1">
          <UFormField label="Yayın durumu">
            <UiAppSelect
              v-model="filter"
              label="Yayın durumu"
              :items="[{ label: 'Tüm durumlar', value: 'all' }, ...aiStatuses]"
              class="w-full"
            />
          </UFormField>
        </div>
        <div class="min-w-48 flex-1">
          <UFormField label="Yayıncı">
            <UiAppSelect
              v-model="publisher"
              label="Yayıncı filtresi"
              :items="[
                { label: 'Tüm profiller', value: 'all' },
                ...(profileData || []).map((item) => ({
                  label: item.name,
                  value: String(item.user_id)
                }))
              ]"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
      <div
        v-if="error"
        class="p-6"
      >
        <UiAppAlert
          title="Yayın planları alınamadı"
          description="Bağlantıyı kontrol ederek tekrar deneyin."
        >
          <template #actions>
            <UiAppButton
              label="Tekrar dene"
              variant="outline"
              @click="list.refresh()"
            />
          </template>
        </UiAppAlert>
      </div>
      <AiPublicationTable
        v-else
        :items="data?.items || []"
        :loading="status === 'pending'"
        @open="openDetail"
      />
      <template #footer>
        <UiAppPagination
          v-if="data && !error"
          v-model:page="page"
          :page-size="pageSize"
          :total="data.total"
          :loading="status === 'pending'"
          item-label="yayın planı"
          page-size-options
          @update:page-size="pageSize = $event"
        />
      </template>
    </UiAppCard>
    <p class="text-xs leading-6 text-dimmed">
      Yayınlanan içerikler normal tarif paylaşımıdır; beğeni, yorum ve kaydetme desteğini kullanır.
      Hazırlık ekranını görüntülemek OpenAI isteği başlatmaz. AI kimliği profil ve gönderilerde
      görünür kalır.
    </p>
    <AiProfileModal
      v-model:open="profileOpen"
      :profile="selectedProfile"
      @saved="profiles.refresh()"
    />
    <AiPrepareModal
      v-model:open="prepareOpen"
      :profiles="profileData || []"
      :settings="settingsData || null"
      :selected-id="planProfileId"
      @saved="prepared"
    />
    <AiPlanModal
      v-model:open="planOpen"
      :profiles="profileData || []"
      :selected-id="planProfileId"
      @saved="prepared"
    />
    <AiPublicationModal
      v-model:open="detailOpen"
      :publication-id="selectedId"
      @changed="refresh"
    />
  </div>
</template>

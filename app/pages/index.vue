<script setup lang="ts">
import type { DashboardData } from '#shared/types/api'

useSeoMeta({ title: 'Genel bakış' })
const api = useApi()
const { user } = useAuth()
const period = ref('all')
const { data, status, error, refresh } = await useAsyncData(
  'dashboard',
  () =>
    api.request<DashboardData>(
      '/dashboard',
      { params: { period: period.value } },
      { error: false }
    ),
  { watch: [period] }
)
const periods = [
  { label: 'Tüm zamanlar', value: 'all' },
  { label: 'Son 7 gün', value: '7' },
  { label: 'Son 30 gün', value: '30' }
]
const pending = computed(() => data.value?.reviews.data?.total)
const dateLabel = computed(() => (data.value ? formatDate(data.value.updatedAt) : ''))
</script>

<template>
  <div>
    <LayoutPageHeading
      eyebrow="Kontrol merkezi"
      :title="`Merhaba, ${user?.name || 'yönetici'} 👋`"
      description="Topluluğunda neler oluyor? Mutfağın nabzını birlikte tutalım."
    >
      <div class="flex items-center gap-3">
        <span class="hidden text-xs text-muted xl:block">{{ dateLabel }}</span><UiAppButton
          label="Güncelle"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="status === 'pending'"
          @click="refresh()"
        />
      </div>
    </LayoutPageHeading>
    <UiAppAlert
      v-if="error"
      title="Dashboard yüklenemedi"
      description="API bağlantısını kontrol edip tekrar deneyin."
      class="mb-6"
    >
      <template #actions>
        <UiAppButton
          label="Tekrar dene"
          variant="outline"
          color="error"
          @click="refresh()"
        />
      </template>
    </UiAppAlert>
    <div
      class="brand-soft relative mb-7 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-primary/15 p-6 sm:p-8"
    >
      <div class="relative z-10">
        <div class="mb-3 flex items-center gap-2 text-xs font-medium">
          <UIcon
            name="i-lucide-sparkles"
            class="brand-ink size-4"
          />Lezzetli bir topluluk, özenli
          bir yönetim.
        </div>
        <h2 class="text-xl font-semibold tracking-tight sm:text-2xl">
          Yeni tariflere yer açalım.
        </h2>
        <p class="mt-2 max-w-lg text-sm leading-6 text-muted">
          {{
            pending == null
              ? 'Paylaşılan tarifleri incele, topluluğun ilhamına ortak ol.'
              : pending > 0
                ? `${formatNumber(pending)} tarif senin değerlendirmeni bekliyor. Yeni ilhamları toplulukla buluştur.`
                : 'İnceleme kuyruğu tamam. Topluluğun yeni tariflerini burada karşılayacağız.'
          }}
        </p>
        <UiAppButton
          to="/reviews"
          label="Tarifleri incele"
          trailing-icon="i-lucide-arrow-right"
          class="mt-5"
        />
      </div>
      <UIcon
        name="i-lucide-chef-hat"
        class="pointer-events-none absolute -right-7 -bottom-8 size-52 rotate-[-12deg] text-primary/10 sm:right-9"
      />
      <div
        class="relative z-10 hidden size-24 items-center justify-center rounded-3xl border border-primary/20 bg-default/70 lg:flex"
      >
        <UIcon
          name="i-lucide-notebook-pen"
          class="size-11 text-primary"
        />
      </div>
    </div>
    <div class="mb-4 flex items-center justify-between">
      <h2 class="font-semibold">
        Genel görünüm
      </h2>
      <UiAppSelect
        v-model="period"
        label="İstatistik tarih aralığı"
        :items="periods"
        class="w-40"
      />
    </div>
    <UiAppAlert
      v-if="data?.stats.error"
      title="İstatistikler yüklenemedi"
      :description="data.stats.error"
      class="mb-4"
    />
    <div class="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        label="Toplam kullanıcı"
        :value="data?.stats.data?.total_users_count"
        icon="i-lucide-users-round"
        :caption="period === 'all' ? 'Topluluğun tüm üyeleri' : 'Bu dönemde katılan üyeler'"
        :loading="status === 'pending'"
      />
      <DashboardStatCard
        label="Oluşturulan tarif"
        :value="data?.stats.data?.total_recipes_count"
        icon="i-lucide-cooking-pot"
        caption="Uygulamada oluşturulan tarifler"
        :loading="status === 'pending'"
      />
      <DashboardStatCard
        label="Koleksiyon"
        :value="data?.stats.data?.total_collections_count"
        icon="i-lucide-book-open"
        caption="Kaydedilen ilham koleksiyonları"
        :loading="status === 'pending'"
      />
      <DashboardStatCard
        label="İnceleme bekliyor"
        :value="pending"
        icon="i-lucide-clock-3"
        caption="Topluluk tarifleri · tüm zamanlar"
        featured
        :loading="status === 'pending'"
      />
    </div>
    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div class="min-w-0 space-y-6">
        <UiAppCard
          title="İnceleme masası"
          description="En son paylaşılan, onay bekleyen tarifler"
          :padded="false"
        >
          <template #actions>
            <UiAppButton
              to="/reviews"
              label="Tümünü gör"
              trailing-icon="i-lucide-arrow-right"
              variant="ghost"
              color="neutral"
              size="sm"
            />
          </template>
          <div
            v-if="data?.reviews.error"
            class="p-6"
          >
            <UiAppAlert
              title="Tarifler yüklenemedi"
              :description="data.reviews.error"
            />
          </div>
          <RecipesRecipeTable
            v-else
            :recipes="data?.reviews.data?.items || []"
            :loading="status === 'pending'"
            @reviewed="refresh()"
          />
          <template #footer>
            <div class="flex items-center gap-2 text-xs text-muted">
              <UIcon
                name="i-lucide-shield-check"
                class="size-4 text-primary"
              />Onayladığın
              tarifler, topluluk akışında yayınlanır.
            </div>
          </template>
        </UiAppCard>
        <UiAppCard
          title="Gelire bir bakış"
          description="Seçili dönemde kaydedilen gerçek ödeme toplamları"
        >
          <div class="grid gap-6 sm:grid-cols-2">
            <div>
              <p class="text-xs text-muted">
                Türk lirası
              </p>
              <p class="mt-2 text-2xl font-semibold">
                {{ formatCurrency(data?.stats.data?.total_payment_amount_try) }}
              </p>
            </div>
            <div class="sm:border-l sm:border-default sm:pl-6">
              <p class="text-xs text-muted">
                Amerikan doları
              </p>
              <p class="mt-2 text-2xl font-semibold">
                {{ formatCurrency(data?.stats.data?.total_payment_amount_usd, 'USD') }}
              </p>
            </div>
          </div>
          <p class="mt-5 text-[11px] leading-5 text-dimmed">
            API'nin raporladığı ödemeler esas alınır. Mevcut rapor, 10 Ağustos 2024 sonrasını
            kapsar.
          </p>
        </UiAppCard>
      </div>
      <div class="space-y-6">
        <DashboardReviewDistribution
          :data="data?.distribution.data || null"
          :error="data?.distribution.error"
        />
        <UiAppCard>
          <div class="flex items-center gap-2 font-semibold">
            <UIcon
              name="i-lucide-radio"
              class="size-4 text-primary"
            />Veri bağlantısı
          </div>
          <p class="mt-3 text-xs leading-6 text-muted">
            Bu paneldeki sayılar doğrudan RecipeGuru API'den gelir.
          </p>
          <div class="mt-4 flex items-center justify-between border-t border-default pt-4 text-xs">
            <span class="text-muted">Son güncelleme</span><span>{{
              data
                ? new Date(data.updatedAt).toLocaleTimeString('tr-TR', {
                  timeZone: 'Europe/Istanbul',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                : '—'
            }}</span>
          </div>
        </UiAppCard>
      </div>
    </div>
  </div>
</template>

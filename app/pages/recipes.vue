<script setup lang="ts">
import type { CatalogQuery } from '#shared/types/catalog'

useSeoMeta({ title: 'Tarifler' })
const { search, locale, sort, page, pageSize, hasFilters, list, languages, submitSearch, reset }
  = useCatalog()
const { data, status, error, refresh } = list
const { data: languageOptions, error: languageError, refresh: refreshLanguages } = languages
const isLoading = computed(() => status.value === 'pending')
</script>

<template>
  <div>
    <LayoutPageHeading
      eyebrow="Tarif kütüphanesi"
      title="Tarifler"
      description="Uygulamadaki tarifleri keşfet, ara ve filtrele."
    >
      <div class="flex items-center gap-3">
        <UiAppButton
          label="Topluluk tarifleri"
          to="/reviews"
          icon="i-lucide-users-round"
          color="neutral"
          variant="outline"
        /><UiAppButton
          label="Güncelle"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="isLoading"
          @click="refresh()"
        />
      </div>
    </LayoutPageHeading>
    <UiAppAlert
      v-if="languageError"
      title="Dil seçenekleri yüklenemedi"
      description="Diğer filtrelerle aramaya devam edebilirsin."
      color="warning"
      class="mb-5"
    >
      <template #actions>
        <UiAppButton
          label="Tekrar dene"
          color="warning"
          variant="outline"
          @click="refreshLanguages()"
        />
      </template>
    </UiAppAlert>
    <UiAppCard
      title="Tüm tarifler"
      description="Tarif adı, dil, porsiyon ve pişirme bilgileri"
      :padded="false"
    >
      <template #actions>
        <UiAppBadge
          v-if="data && !isLoading"
          color="primary"
        >
          {{ formatNumber(data.total) }} tarif
        </UiAppBadge>
      </template>
      <RecipesCatalogFilters
        v-model:search="search"
        v-model:locale="locale"
        :sort="sort"
        :languages="languageOptions || []"
        :loading="isLoading"
        :filtered="hasFilters"
        @update:sort="sort = $event as CatalogQuery['sort']"
        @search="submitSearch"
        @reset="reset"
      />
      <div
        v-if="error"
        class="p-6"
      >
        <UiAppAlert
          title="Tarifler yüklenemedi"
          description="API bağlantısını kontrol edip yeniden deneyin."
        >
          <template #actions>
            <UiAppButton
              label="Tekrar dene"
              color="error"
              variant="outline"
              @click="refresh()"
            />
          </template>
        </UiAppAlert>
      </div>
      <RecipesCatalogTable
        v-else
        :recipes="data?.items || []"
        :loading="isLoading"
        :filtered="hasFilters"
        @reset="reset"
      />
      <template #footer>
        <UiAppPagination
          v-if="data && !error"
          v-model:page="page"
          :page-size="pageSize"
          :total="data.total"
          :loading="isLoading"
          page-size-options
          @update:page-size="pageSize = $event"
        />
        <p
          v-else
          class="text-xs text-muted"
        >
          {{ isLoading ? 'Tarifler yükleniyor…' : 'Tarif sayısı şu anda alınamıyor.' }}
        </p>
      </template>
    </UiAppCard>
    <p class="mt-4 text-xs text-dimmed">
      Kullanıcıların paylaştığı tarifleri değerlendirmek için
      <NuxtLink
        to="/reviews"
        class="font-medium text-primary hover:underline"
      >Tarif incelemeleri</NuxtLink>
      ekranını kullanabilirsin.
    </p>
  </div>
</template>

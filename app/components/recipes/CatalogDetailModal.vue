<script setup lang="ts">
import axios from 'axios'
import type { ApiFailure } from '#shared/types/api'
import type { CatalogDetail, CatalogRecipe } from '#shared/types/catalog'
import { personRange } from '#shared/utils/catalog'

const props = defineProps<{ recipe: CatalogRecipe | null }>()
const open = defineModel<boolean>('open', { default: false })
const api = useApi()
const detail = ref<CatalogDetail | null>(null)
const loading = ref(false)
const error = ref('')
const imageFailed = ref(false)
let controller: AbortController | undefined
let sequence = 0
async function load() {
  if (!props.recipe || !open.value) return
  controller?.abort()
  controller = new AbortController()
  const current = ++sequence
  loading.value = true
  detail.value = null
  error.value = ''
  imageFailed.value = false
  try {
    const value = await api.request<CatalogDetail>(
      `/catalog/${props.recipe.id}`,
      { params: { locale: props.recipe.locale || undefined }, signal: controller.signal },
      { error: false }
    )
    if (current === sequence && open.value) detail.value = value
  } catch (failure) {
    if (current === sequence && !axios.isCancel(failure))
      error.value = (failure as ApiFailure).message
  } finally {
    if (current === sequence) loading.value = false
  }
}
watch([() => open.value, () => props.recipe?.id, () => props.recipe?.locale], () => {
  if (open.value) void load()
  else {
    sequence++
    controller?.abort()
    detail.value = null
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
    :title="detail?.title || recipe?.title || 'Tarif detayı'"
    :description="recipe ? '#' + recipe.id + ' · Tarif kütüphanesi' : 'Tarif kütüphanesi'"
  >
    <div
      v-if="loading"
      class="space-y-5"
      role="status"
      aria-label="Tarif detayı yükleniyor"
    >
      <USkeleton class="h-36 w-full rounded-xl" /><USkeleton
        v-for="index in 4"
        :key="index"
        class="h-6 w-full"
      />
    </div>
    <UiAppAlert
      v-else-if="error"
      title="Tarif detayı yüklenemedi"
      :description="error"
    >
      <template #actions>
        <UiAppButton
          label="Tekrar dene"
          color="error"
          variant="outline"
          @click="load"
        />
      </template>
    </UiAppAlert>
    <div
      v-else-if="detail"
      class="space-y-7"
    >
      <img
        v-if="detail.imageUrl && !imageFailed"
        :src="detail.imageUrl"
        :alt="detail.title || 'Tarif kapak fotoğrafı'"
        class="max-h-64 w-full rounded-xl object-cover"
        referrerpolicy="no-referrer"
        @error="imageFailed = true"
      >
      <UiAppAlert
        v-if="imageFailed"
        title="Kapak fotoğrafı yüklenemedi"
        color="warning"
      />
      <div class="flex flex-wrap items-center gap-2">
        <UiAppBadge
          v-if="detail.locale"
          color="primary"
        >
          {{
            detail.locale.toUpperCase()
          }}
        </UiAppBadge><UiAppBadge v-if="detail.repast">
          {{ detail.repast }}
        </UiAppBadge><UiAppBadge v-if="detail.cooker">
          {{ detail.cooker }}
        </UiAppBadge>
      </div>
      <dl class="grid grid-cols-3 gap-3">
        <div class="brand-soft rounded-xl p-3">
          <dt class="text-xs text-muted">
            Porsiyon
          </dt>
          <dd class="mt-2 text-sm font-semibold">
            {{ personRange(detail.minPerson, detail.maxPerson) }}
          </dd>
        </div>
        <div class="brand-soft rounded-xl p-3">
          <dt class="text-xs text-muted">
            Pişirme süresi
          </dt>
          <dd class="mt-2 text-sm font-semibold">
            {{ detail.cookingTime == null ? '—' : detail.cookingTime + ' dk' }}
          </dd>
        </div>
        <div class="brand-soft rounded-xl p-3">
          <dt class="text-xs text-muted">
            Kalori
          </dt>
          <dd class="mt-2 text-sm font-semibold">
            {{ detail.calories == null ? '—' : formatNumber(detail.calories) + ' kcal' }}
          </dd>
        </div>
      </dl>
      <section>
        <h3 class="mb-3 flex items-center gap-2 font-semibold text-highlighted">
          <UIcon
            name="i-lucide-carrot"
            class="size-4 text-primary"
          />Malzemeler
        </h3>
        <ul
          v-if="detail.ingredients.length"
          class="list-inside list-disc space-y-2 text-sm leading-6 text-muted"
        >
          <li
            v-for="(ingredient, index) in detail.ingredients"
            :key="index"
          >
            {{ ingredient }}
          </li>
        </ul>
        <p
          v-else
          class="text-sm text-muted"
        >
          Bu tarif için malzeme bilgisi bulunmuyor.
        </p>
      </section>
      <RecipesRecipeContentSections
        v-if="detail.sections.length"
        :sections="detail.sections"
      /><UiAppAlert
        v-else
        title="Hazırlanış bilgisi bulunamadı"
        description="Seçili dilde tarifin hazırlanış metni bulunmuyor."
        color="warning"
      />
      <section v-if="detail.tips.length">
        <h3 class="mb-3 flex items-center gap-2 font-semibold text-highlighted">
          <UIcon
            name="i-lucide-lightbulb"
            class="size-4 text-primary"
          />Püf noktaları
        </h3>
        <ul class="list-inside list-disc space-y-2 text-sm leading-7 text-muted">
          <li
            v-for="(tip, index) in detail.tips"
            :key="index"
          >
            {{ tip }}
          </li>
        </ul>
      </section>
      <p
        v-if="detail.createdAt"
        class="border-t border-default pt-4 text-xs text-dimmed"
      >
        {{ formatDate(detail.createdAt) }} tarihinde eklendi.
      </p>
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

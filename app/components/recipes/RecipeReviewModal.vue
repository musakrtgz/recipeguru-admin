<script setup lang="ts">
import type { SubmittedRecipe } from '#shared/types/api'
import { recipeStatusLabel } from '#shared/utils/recipeReview'

const props = defineProps<{ recipe: SubmittedRecipe | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ reviewed: [] }>()
const {
  detail,
  loading,
  saving,
  editing,
  conflict,
  error,
  fields,
  note,
  draft,
  structured,
  load,
  edit,
  cancelEdit,
  save,
  review
} = useRecipeReview(
  () => props.recipe?.id,
  open,
  () => emit('reviewed')
)
const rejectOpen = ref(false)
function startRejection() {
  note.value = ''
  fields.value = {}
  error.value = ''
  rejectOpen.value = true
}
async function reject() {
  if (await review('rejected')) rejectOpen.value = false
}
watch(open, (value) => {
  if (!value) rejectOpen.value = false
})
const moderationHelp = computed(() =>
  detail.value?.status === 'approved'
    ? 'Yayından kaldır düğmesi tarifi akıştan kaldırır ve yeniden incelemeye alır.'
    : detail.value?.status === 'rejected'
      ? 'Tarifi yeniden incelemeye alabilir veya onaylayarak yayınlayabilirsiniz.'
      : 'İnceleme tamamlandığında aşağıdaki düğmelerle onaylayabilir veya gerekçesiyle reddedebilirsiniz.'
)
const photos = computed(() => {
  const value = detail.value
  if (!value) return []
  return [
    ...(value.cover_image ? [{ ...value.cover_image, label: 'Kapak' }] : []),
    ...(value.gallery || []).map((image, index) => ({ ...image, label: 'Galeri ' + (index + 1) }))
  ].map(image => ({
    id: image.id,
    label: image.label,
    src: `/api/media/recipes/${value.id}/${image.id}`
  }))
})
const statusColor = computed(() =>
  detail.value?.status === 'pending'
    ? 'warning'
    : detail.value?.status === 'approved'
      ? 'success'
      : 'error'
)
</script>

<template>
  <UiAppModal
    v-model:open="open"
    :title="detail?.title || recipe?.title || 'Tarif incelemesi'"
    description="Fotoğrafları ve içeriği inceleyin, tarifi düzenleyin veya yayın durumunu değiştirin."
    :busy="saving || editing || rejectOpen"
    size="wide"
  >
    <div
      v-if="loading"
      role="status"
      aria-label="Tarif yükleniyor"
      class="space-y-4"
    >
      <USkeleton class="h-56 w-full rounded-xl" /><USkeleton
        v-for="index in 4"
        :key="index"
        class="h-6 w-full"
      />
    </div>
    <div
      v-else
      class="space-y-6"
    >
      <UiAppAlert
        v-if="error"
        title="İşlem tamamlanamadı"
        :description="error"
      >
        <template #actions>
          <UiAppButton
            v-if="!detail"
            label="Tekrar dene"
            variant="outline"
            color="neutral"
            @click="load"
          />
          <UiAppButton
            v-if="conflict"
            :label="editing ? 'Değişiklikleri bırak ve günceli yükle' : 'Güncel tarifi yükle'"
            variant="outline"
            color="neutral"
            @click="load"
          />
        </template>
      </UiAppAlert>
      <template v-if="detail">
        <div class="flex flex-wrap items-center gap-3 text-xs text-muted">
          <UiAppBadge :color="statusColor">
            {{ recipeStatusLabel(detail.status) }}
          </UiAppBadge>
          <span>{{
            detail.author
              ? [detail.author.name, detail.author.surname].filter(Boolean).join(' ')
              : 'Silinmiş kullanıcı'
          }}</span>
          <span>{{ detail.person_count }} kişilik ·
            {{ detail.cooking_time == null ? 'Süre belirtilmemiş' : detail.cooking_time + ' dk' }} ·
            {{ detail.locale.toUpperCase() }}</span>
          <UiAppButton
            v-if="!editing"
            label="Tarifi düzenle"
            icon="i-lucide-pencil"
            variant="soft"
            size="sm"
            :disabled="saving || conflict"
            class="sm:ml-auto"
            @click="edit"
          />
        </div>
        <UiAppAlert
          v-if="!editing"
          :title="'Tarif durumu: ' + recipeStatusLabel(detail.status)"
          :description="moderationHelp"
          :color="
            detail.status === 'approved'
              ? 'success'
              : detail.status === 'rejected'
                ? 'warning'
                : 'info'
          "
        />
        <div
          v-if="!editing && detail.review_note"
          class="rounded-xl border border-default p-4 text-sm"
        >
          <h3 class="mb-2 font-semibold">
            Son inceleme notu
          </h3>
          <p class="whitespace-pre-wrap text-muted">
            {{ detail.review_note }}
          </p>
        </div>
        <UiAppImageGallery
          v-if="photos.length"
          :images="photos"
        />
        <UiAppAlert
          v-else
          title="Bu tarifte fotoğraf bulunmuyor"
          color="info"
        />
        <RecipesRecipeEditForm
          v-if="editing"
          v-model="draft"
          :structured="structured"
          :errors="fields"
          :disabled="saving"
        />
        <template v-else>
          <section v-if="detail.ingredients?.length">
            <h3 class="mb-3 font-semibold">
              Malzemeler
            </h3>
            <ul class="list-inside list-disc space-y-2 text-sm text-muted">
              <li
                v-for="(item, index) in detail.ingredients"
                :key="index"
              >
                {{ item }}
              </li>
            </ul>
          </section>
          <section v-if="detail.preparation || detail.content">
            <h3 class="mb-3 font-semibold">
              Hazırlanışı
            </h3>
            <p class="text-sm leading-7 whitespace-pre-wrap text-muted">
              {{ detail.preparation || detail.content }}
            </p>
          </section>
          <section v-if="detail.tips">
            <h3 class="mb-3 font-semibold">
              Püf noktaları
            </h3>
            <p class="text-sm leading-7 whitespace-pre-wrap text-muted">
              {{ detail.tips }}
            </p>
          </section>
          <p
            v-if="detail.reviewed_at"
            class="text-xs text-muted"
          >
            Son inceleme: {{ formatDate(detail.reviewed_at, true) }} ·
            {{ detail.review_source === 'ai' ? 'Yapay zekâ' : 'Admin' }}
          </p>
        </template>
      </template>
    </div>
    <RecipesRecipeRejectionDialog
      v-model:open="rejectOpen"
      v-model:note="note"
      :busy="saving"
      :error="error"
      :field-error="fields.review_note?.[0]"
      @confirm="reject"
    />
    <template #footer>
      <template v-if="editing">
        <UiAppButton
          label="Düzenlemekten vazgeç"
          color="neutral"
          variant="outline"
          :disabled="saving"
          @click="cancelEdit"
        />
        <UiAppButton
          label="Değişiklikleri kaydet"
          icon="i-lucide-save"
          :loading="saving"
          :disabled="conflict"
          @click="save"
        />
      </template>
      <template v-else>
        <UiAppButton
          label="Kapat"
          color="neutral"
          variant="outline"
          :disabled="saving"
          @click="open = false"
        />
        <RecipesRecipeReviewActions
          v-if="detail"
          :status="detail.status"
          :loading="saving"
          :disabled="conflict"
          @review="review"
          @reject="startRejection"
        />
      </template>
    </template>
  </UiAppModal>
</template>

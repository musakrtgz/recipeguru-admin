<script setup lang="ts">
import { aiStatusLabel, aiStatusColor, aiDate, aiMoney } from '#shared/utils/aiPublications'
import type { AiAction } from '#shared/utils/aiPublications'

const props = defineProps<{ publicationId: number | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ changed: [] }>()
const {
  detail,
  loading,
  saving,
  editing,
  error,
  conflict,
  note,
  scheduled,
  fields,
  draft,
  load,
  edit,
  save,
  action
} = useAiPublicationEditor(
  () => props.publicationId,
  open,
  () => emit('changed')
)
const confirm = ref(false),
  confirmAction = ref<AiAction>('regenerate')
const terminal = computed(
  () => !detail.value || ['published', 'rejected', 'cancelled'].includes(detail.value.status)
)
const sections = computed(() =>
  detail.value?.draft
    ? [
        { title: 'Malzemeler', items: detail.value.draft.ingredients },
        { title: 'Hazırlanışı', items: [detail.value.draft.preparation] },
        ...(detail.value.draft.tips
          ? [{ title: 'Püf noktaları', items: [detail.value.draft.tips] }]
          : [])
      ]
    : []
)
function requestAction(value: AiAction) {
  confirmAction.value = value
  confirm.value = true
}
async function commitAction() {
  await action(confirmAction.value)
  if (!error.value) confirm.value = false
}
watch(open, (value) => {
  if (!value) confirm.value = false
})
</script>

<template>
  <UiAppModal
    v-model:open="open"
    :title="detail?.title || 'AI yayın planı'"
    :description="detail?.manual_preparation
      ? 'Hazırlanan tarifi inceleyin, düzenleyin ve hazır olduğunuzda yayınlayın.'
      : 'Tarifi inceleyin; planlanan saatte paylaşın veya hemen yayına alın.'"
    size="wide"
    :busy="saving"
  >
    <div
      v-if="loading"
      role="status"
      aria-label="AI tarif detayı yükleniyor"
    >
      <USkeleton class="h-72 w-full" />
    </div>
    <div
      v-else
      class="space-y-6"
    >
      <UiAppAlert
        v-if="error"
        title="İşlem tamamlanamadı"
        :description="error"
      />
      <UiAppAlert
        v-if="conflict"
        title="Tarif değişmiş"
        description="Taslağınız korunuyor. Son durumu yükleyerek devam edin."
        color="warning"
      >
        <template #actions>
          <UiAppButton
            label="Taslağı bırak ve günceli yükle"
            variant="outline"
            @click="load()"
          />
        </template>
      </UiAppAlert>
      <UiAppButton
        v-if="!detail"
        label="Tekrar dene"
        variant="outline"
        @click="load()"
      />
      <template v-if="detail">
        <div class="flex flex-wrap items-center gap-3">
          <UiAppBadge color="primary">
            AI
          </UiAppBadge><span class="font-semibold text-highlighted">{{ detail.author_name }}</span><UiAppBadge :color="aiStatusColor(detail.status, detail.review_passed)">
            {{
              aiStatusLabel(detail.status, detail.review_passed)
            }}
          </UiAppBadge><span class="text-sm text-muted">{{ detail.published_at ? aiDate(detail.published_at) : detail.manual_preparation ? 'Yayın kararı sizde' : aiDate(detail.scheduled_at) }}</span>
        </div>
        <AiPreparationStatus :publication="detail" />
        <UiAppAlert
          v-if="detail.preparation_brief"
          title="Tarif için ek not"
          :description="detail.preparation_brief"
          color="info"
          icon="i-lucide-notebook-pen"
        />
        <UiAppAlert
          v-if="detail.error_message"
          title="Üretim bilgisi"
          :description="detail.error_message"
          color="warning"
        />
        <UiAppAlert
          v-if="detail.ai_review && !detail.ai_review.approved"
          :title="detail.cover_image ? 'AI kontrolünde düzeltme gerekiyor' : 'Tarif düzeltilmeli; kapak üretilmedi'"
          :description="[detail.ai_review.issues.join(' '), !detail.cover_image
            ? 'Tarif kontrolden geçmediği için kapak fotoğrafı hazırlanmadı. Tarifi düzenleyip yeniden kontrol ettirin veya Yeniden üret ile isteğinize uygun yeni tarif hazırlatın.'
            : ''].filter(Boolean).join(' ')"
          color="warning"
        />
        <UiAppAlert
          v-if="detail.status === 'ready' && !detail.manual_preparation"
          title="Yayın saati bekleniyor"
          description="Planlayıcı yayın saatini bekliyor. Beklemeden paylaşmak için Şimdi yayınla düğmesini kullanabilirsiniz."
          color="info"
        />
        <UiAppAlert
          v-if="detail.status === 'published'"
          title="Tarif yayınlandı"
          :description="'Paylaşım zamanı: ' + aiDate(detail.published_at) + ' · Ana sayfada ve AI profilinde görünür.'"
          color="success"
        />
        <form
          v-if="editing"
          id="ai-recipe-edit"
          class="space-y-5"
          @submit.prevent="save"
        >
          <RecipesRecipeEditForm
            v-model="draft"
            :structured="true"
            :errors="fields"
            :disabled="saving"
            notice-title="Değişiklikler yeniden kontrol edilir"
            notice-description="Tarif değişince mevcut onay ve kapak kaldırılır. Düzenlenen tarif kontrol edilip yeni kapak hazırlanır; tekrar onayınızı bekler."
          />
          <UiAppInput
            v-if="!detail.manual_preparation"
            v-model="scheduled"
            label="Yayın saati (cihaz saati)"
            name="scheduled_at"
            type="datetime-local"
            step="1"
            :disabled="saving"
            :error="fields.scheduled_at?.[0]"
          />
        </form>
        <template v-else>
          <UiAppImageGallery
            v-if="detail.cover_image"
            :aspect-ratio="detail.cover_image.width && detail.cover_image.height ? detail.cover_image.width / detail.cover_image.height : undefined"
            :images="[
              {
                id: detail.cover_image.id,
                src: detail.cover_image.url,
                label: 'AI ile üretilen kapak'
              }
            ]"
          />
          <div
            v-if="detail.draft"
            class="flex flex-wrap gap-3 text-sm text-muted"
          >
            <span>{{ detail.draft.person_count }} kişilik</span><span>{{ detail.draft.cooking_time }} dakika</span><span>{{ detail.locale.toUpperCase() }}</span>
          </div>
          <RecipesRecipeContentSections :sections="sections" />
          <UiAppAlert
            v-if="!detail.draft && !['planned', 'generating'].includes(detail.status)"
            title="Tarif henüz hazırlanmadı"
            description="Üretim bilgisini kontrol ederek eksik aşamayı yeniden deneyebilirsiniz."
            color="info"
          />
          <UiAppTextarea
            v-if="!terminal"
            v-model="note"
            label="İnceleme notu (ret için zorunlu)"
            name="note"
            :maxlength="2000"
            :disabled="saving"
            :error="fields.note?.[0]"
          />
          <NuxtLink
            v-if="detail.submitted_recipe_id"
            to="/reviews"
            class="text-sm font-medium text-primary"
          >Yayınlanan tarifi Tarif incelemeleri bölümünden yönetin · #{{
            detail.submitted_recipe_id
          }}</NuxtLink>
        </template>
        <UiAppCard
          v-if="detail.attempts?.length"
          title="Üretim ve kullanım geçmişi"
          description="Maliyetler tahminidir. Belirsiz denemelerde ayrılan bütçe payı korunur."
        >
          <div
            v-for="attempt in detail.attempts"
            :key="attempt.id"
            class="flex flex-wrap items-center justify-between gap-3 border-b border-default py-3 text-xs last:border-0"
          >
            <div>
              <p class="font-medium text-highlighted">
                {{
                  { recipe: 'Tarif', review: 'Kontrol', image: 'Kapak' }[attempt.stage]
                    || attempt.stage
                }}
                · {{ attempt.status }}
              </p>
              <p class="mt-1 text-muted">
                {{ attempt.model }} · {{ aiDate(attempt.created_at) }}
              </p>
              <p
                v-if="attempt.error_code"
                class="mt-1 text-error"
              >
                {{ attempt.error_code }}
              </p>
            </div>
            <span>{{ aiMoney(attempt.estimated_usd) }}
              <span
                v-if="attempt.estimated_usd === null"
                class="text-muted"
              >· ayrılan {{ aiMoney(attempt.reserved_usd) }}</span></span>
          </div>
        </UiAppCard>
      </template>
    </div>
    <template #footer>
      <UiAppButton
        label="Kapat"
        color="neutral"
        variant="outline"
        :disabled="saving"
        @click="open = false"
      />
      <template v-if="detail && !conflict">
        <template v-if="editing">
          <UiAppButton
            label="Düzenlemekten vazgeç"
            color="neutral"
            variant="ghost"
            :disabled="saving"
            @click="editing = false"
          /><UiAppButton
            label="Kaydet ve yeniden kontrol et"
            type="submit"
            form="ai-recipe-edit"
            :loading="saving"
          />
        </template>
        <template v-else-if="!terminal">
          <UiAppButton
            v-if="detail.draft && detail.status !== 'generating'"
            label="Tarifi düzenle"
            variant="outline"
            color="neutral"
            :disabled="saving"
            @click="edit"
          />
          <UiAppButton
            v-if="detail.status === 'failed'"
            label="Eksik aşamayı yeniden dene"
            variant="outline"
            :disabled="saving"
            @click="requestAction('retry')"
          />
          <UiAppButton
            v-if="detail.status !== 'generating'"
            label="Yeniden üret"
            variant="outline"
            :disabled="saving"
            @click="requestAction('regenerate')"
          />
          <UiAppButton
            v-if="detail.status === 'needs_review' || detail.status === 'ready'"
            label="Reddet"
            color="error"
            variant="soft"
            :loading="saving"
            @click="action('reject')"
          />
          <UiAppButton
            label="Planı iptal et"
            color="neutral"
            variant="ghost"
            :disabled="saving"
            @click="requestAction('cancel')"
          />
          <UiAppButton
            v-if="detail.status === 'needs_review' && !detail.manual_preparation"
            label="Onayla ve planla"
            icon="i-lucide-calendar-check"
            variant="outline"
            :disabled="saving || !detail.ai_review?.approved || !detail.cover_image"
            @click="action('approve')"
          />
          <UiAppButton
            v-if="(detail.status === 'needs_review' || detail.status === 'ready') && detail.ai_review?.approved && detail.cover_image"
            :label="detail.status === 'needs_review' ? 'Onayla ve şimdi yayınla' : 'Şimdi yayınla'"
            icon="i-lucide-send"
            :loading="saving"
            @click="action('publish-now')"
          />
          <UiAppButton
            v-if="detail.status === 'generating' || detail.status === 'planned'"
            label="Durumu yenile"
            variant="outline"
            :disabled="saving"
            @click="load()"
          />
        </template>
      </template>
    </template>
  </UiAppModal>
  <UiAppModal
    v-model:open="confirm"
    :title="
      confirmAction === 'cancel'
        ? 'Yayın planını iptal et'
        : confirmAction === 'retry'
          ? 'Eksik aşamayı yeniden dene'
          : 'Tarifi yeniden üret'
    "
    :busy="saving"
  >
    <p class="text-sm leading-7 text-muted">
      {{
        confirmAction === 'cancel'
          ? 'Bu plan yayınlanmayacak. Başlamış OpenAI çağrısı tamamlanabilir; kullanım kaydı korunur.'
          : confirmAction === 'retry'
            ? 'Tamamlanan aşamalar korunur. Eksik aşama için yeni bir OpenAI isteği ve maliyeti oluşabilir; günlük bütçe uygulanır.'
            : 'Mevcut taslak, kapak ve onay kaldırılacak. Yeni tarif ve görsel üretimi için OpenAI maliyeti oluşacak; günlük bütçe uygulanır.'
      }}
    </p>
    <UiAppAlert
      v-if="error"
      class="mt-4"
      title="İşlem tamamlanamadı"
      :description="error"
    />
    <template #footer>
      <UiAppButton
        label="Vazgeç"
        variant="outline"
        color="neutral"
        :disabled="saving"
        @click="confirm = false"
      /><UiAppButton
        :label="confirmAction === 'cancel' ? 'Planı iptal et' : 'Devam et'"
        :loading="saving"
        @click="commitAction"
      />
    </template>
  </UiAppModal>
</template>

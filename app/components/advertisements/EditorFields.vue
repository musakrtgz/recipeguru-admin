<script setup lang="ts">
import type { AdvertisementDraft, AdvertisementTarget } from '#shared/types/advertisements'
import { adTypes } from '#shared/utils/advertisements'

defineProps<{ errors: Record<string, string[]>, disabled?: boolean }>()
const draft = defineModel<AdvertisementDraft>({ required: true })
const pickerOpen = ref(false)
const selectedTitle = ref('')
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
watch(
  () => draft.value.destination_type,
  () => {
    draft.value.destination_id = ''
    selectedTitle.value = ''
  }
)
function select(value: AdvertisementTarget) {
  draft.value.destination_id = String(value.id)
  selectedTitle.value = value.title
}
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-4">
      <h3 class="font-semibold text-highlighted">
        Reklam içeriği
      </h3>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiAppInput
          v-model="draft.title"
          label="Başlık"
          name="title"
          required
          :maxlength="180"
          :error="errors.title?.[0]"
          :disabled="disabled"
        /><UiAppInput
          v-model="draft.sponsor_name"
          label="Sponsor adı"
          name="sponsor_name"
          required
          :maxlength="120"
          :error="errors.sponsor_name?.[0]"
          :disabled="disabled"
        />
      </div>
      <UiAppTextarea
        v-model="draft.body"
        label="Açıklama"
        name="body"
        :maxlength="2000"
        :error="errors.body?.[0]"
        :disabled="disabled"
      />
      <UiAppInput
        v-model="draft.cta_label"
        label="Yönlendirme düğmesinin yazısı"
        name="cta_label"
        placeholder="Örneğin: Tarifi incele"
        :maxlength="40"
        :error="errors.cta_label?.[0]"
        :disabled="disabled"
      />
      <p class="text-xs text-muted">
        Sponsorlu etiketi uygulamada her zaman görünür.
      </p>
    </section>
    <section class="space-y-4 border-t border-default pt-6">
      <h3 class="font-semibold text-highlighted">
        Tıklandığında ne açılsın?
      </h3>
      <UFormField
        label="Yönlendirme türü"
        name="destination_type"
        :error="errors.destination_type?.[0]"
        required
      >
        <UiAppSelect
          v-model="draft.destination_type"
          label="Yönlendirme türü"
          :items="adTypes"
          :disabled="disabled"
          class="w-full"
        />
      </UFormField>
      <UiAppInput
        v-if="draft.destination_type === 'external'"
        v-model="draft.external_url"
        label="Harici bağlantı"
        name="external_url"
        type="url"
        placeholder="https://…"
        required
        :maxlength="2048"
        :error="errors.external_url?.[0]"
        :disabled="disabled"
      />
      <div
        v-else
        class="space-y-3"
      >
        <UiAppInput
          :model-value="
            draft.destination_id ? selectedTitle || 'Tarif #' + draft.destination_id : ''
          "
          label="Seçilen tarif"
          name="destination_id"
          placeholder="Henüz tarif seçilmedi"
          readonly
          required
          :error="errors.destination_id?.[0]"
          :disabled="disabled"
        />
        <UiAppButton
          :label="draft.destination_id ? 'Tarifi değiştir' : 'Tarif seç'"
          icon="i-lucide-book-open"
          variant="outline"
          :disabled="disabled"
          @click="pickerOpen = true"
        />
        <p class="text-xs text-muted">
          Kullanıcı tarifleri onaylı ve görünür olmalıdır. Kaynak sonradan kaldırılırsa reklam
          yayını da durur.
        </p>
        <AdvertisementsTargetPicker
          v-model:open="pickerOpen"
          :type="draft.destination_type === 'submitted_recipe' ? 'submitted_recipe' : 'recipe'"
          @selected="select"
        />
      </div>
    </section>
    <section class="space-y-4 border-t border-default pt-6">
      <h3 class="font-semibold text-highlighted">
        Yayın planı
      </h3>
      <UiAppSwitch
        v-model="draft.is_active"
        label="Kampanya etkin"
        description="Etkin kampanyalar yayın tarihleri, kaynak görünürlüğü ve kotalar uygunsa akışta gösterilir."
        :disabled="disabled"
      />
      <div class="grid gap-4 sm:grid-cols-2">
        <UiAppInput
          v-model="draft.starts_at"
          label="Başlangıç tarihi ve saati"
          name="starts_at"
          type="datetime-local"
          step="1"
          required
          :error="errors.starts_at?.[0]"
          :disabled="disabled"
        /><UiAppInput
          v-model="draft.ends_at"
          label="Bitiş tarihi ve saati"
          name="ends_at"
          type="datetime-local"
          step="1"
          required
          :error="errors.ends_at?.[0]"
          :disabled="disabled"
        />
      </div>
      <p class="text-xs text-muted">
        Saat diliminiz: {{ timezone }}. Tarihler bu saat diliminden dönüştürülerek kaydedilir.
      </p>
      <UFormField
        label="Gösterilecek dil"
        name="locale"
        :error="errors.locale?.[0]"
      >
        <UiAppSelect
          v-model="draft.locale"
          label="Gösterilecek dil"
          :items="[
            { label: 'Tüm diller', value: 'all' },
            { label: 'Türkçe', value: 'tr' },
            { label: 'English', value: 'en' }
          ]"
          :disabled="disabled"
          class="w-full"
        />
      </UFormField>
      <div class="grid gap-4 sm:grid-cols-3">
        <UiAppInput
          v-model="draft.weight"
          label="Dönüşüm ağırlığı"
          name="weight"
          type="number"
          min="1"
          max="100"
          step="1"
          required
          :error="errors.weight?.[0]"
          :disabled="disabled"
        />
        <UiAppInput
          v-model="draft.daily_user_cap"
          label="Kişi başına günlük sınır"
          name="daily_user_cap"
          type="number"
          min="1"
          max="100"
          step="1"
          required
          :error="errors.daily_user_cap?.[0]"
          :disabled="disabled"
        />
        <UiAppInput
          v-model="draft.max_impressions"
          label="Toplam gösterim sınırı"
          name="max_impressions"
          type="number"
          min="1"
          step="1"
          placeholder="Sınırsız"
          :error="errors.max_impressions?.[0]"
          :disabled="disabled"
        />
      </div>
      <p class="text-xs leading-5 text-muted">
        Ağırlık yükseldikçe kampanyanın diğer reklamlar arasındaki seçilme payı artar. Bu değer
        gösterim garantisi değildir. Toplam sınırı boş bırakırsanız kampanya kotasızdır.
      </p>
    </section>
  </div>
</template>

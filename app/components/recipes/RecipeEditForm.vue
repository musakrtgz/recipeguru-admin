<script setup lang="ts">
import type { RecipeEditDraft } from '#shared/utils/recipeReview'

defineProps<{ structured: boolean, errors: Record<string, string[]>, disabled?: boolean }>()
const draft = defineModel<RecipeEditDraft>({ required: true })
</script>

<template>
  <div class="space-y-5">
    <UiAppAlert
      title="Kaydedilen değişiklikler yeniden incelenir"
      description="Tarif değişirse yayından kaldırılır ve İncelemede durumuna alınır. Fotoğrafları, dili ve paylaşan kişi korunur. Ardından tekrar onaylayabilirsiniz."
      color="info"
    />
    <UiAppInput
      v-model="draft.title"
      label="Tarif adı"
      name="title"
      :maxlength="200"
      required
      :error="errors.title?.[0]"
      :disabled="disabled"
    />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <UiAppInput
        v-model="draft.person_count"
        label="Kaç kişilik?"
        name="person_count"
        type="number"
        min="1"
        max="100"
        step="1"
        required
        :error="errors.person_count?.[0]"
        :disabled="disabled"
      />
      <UiAppInput
        v-model="draft.cooking_time"
        label="Pişirme süresi (dakika)"
        name="cooking_time"
        type="number"
        min="1"
        max="1440"
        step="1"
        required
        :error="errors.cooking_time?.[0]"
        :disabled="disabled"
      />
    </div>
    <template v-if="structured">
      <UiAppTextListField
        v-model="draft.ingredients"
        label="Malzemeler"
        name="ingredients"
        :error="errors.ingredients?.[0]"
        :disabled="disabled"
      />
      <UiAppTextarea
        v-model="draft.preparation"
        label="Hazırlanışı"
        name="preparation"
        required
        :maxlength="20000"
        :error="errors.preparation?.[0]"
        :disabled="disabled"
      />
    </template>
    <template v-else>
      <UiAppAlert
        title="Bu tarif eski metin biçiminde kaydedilmiş"
        description="Malzemeler ve hazırlanış mevcut metin içinde korunur."
        color="info"
      />
      <UiAppTextarea
        v-model="draft.content"
        label="Tarif metni"
        name="content"
        required
        :maxlength="20000"
        :error="errors.content?.[0]"
        :disabled="disabled"
      />
    </template>
    <UiAppTextarea
      v-model="draft.tips"
      label="Püf noktaları"
      name="tips"
      :maxlength="5000"
      :error="errors.tips?.[0]"
      :disabled="disabled"
    />
  </div>
</template>

<script setup lang="ts">
import type { CatalogLanguage } from '#shared/types/catalog'

defineProps<{ languages: CatalogLanguage[], loading?: boolean, filtered?: boolean }>()
const search = defineModel<string>('search', { default: '' })
const locale = defineModel<string>('locale', { default: 'all' })
const sort = defineModel<string>('sort', { default: '-id' })
defineEmits<{ search: [], reset: [] }>()
</script>

<template>
  <form
    class="grid items-end gap-4 border-b border-default p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_170px_200px_auto]"
    role="search"
    @submit.prevent="$emit('search')"
  >
    <UiAppInput
      v-model="search"
      label="Tarif adı"
      name="catalog-search"
      icon="i-lucide-search"
      placeholder="Örneğin mercimek çorbası…"
      :maxlength="150"
    />
    <UFormField
      label="Dil"
      name="catalog-locale"
    >
      <UiAppSelect
        v-model="locale"
        label="Tarif dili"
        :items="[
          { label: 'Tüm diller', value: 'all' },
          ...languages.map((item) => ({ label: item.name, value: item.code }))
        ]"
        class="w-full"
      />
    </UFormField>
    <UFormField
      label="Sıralama"
      name="catalog-sort"
    >
      <UiAppSelect
        v-model="sort"
        label="Tarif sıralaması"
        :items="[
          { label: 'En yeni eklenen', value: '-id' },
          { label: 'En eski eklenen', value: 'id' },
          { label: 'Pişirme süresi: kısa', value: 'cooking_time' },
          { label: 'Pişirme süresi: uzun', value: '-cooking_time' }
        ]"
        class="w-full"
      />
    </UFormField>
    <div class="flex gap-2">
      <UiAppButton
        type="submit"
        label="Ara"
        icon="i-lucide-search"
        :loading="loading"
      /><UiAppButton
        v-if="filtered || search"
        label="Sıfırla"
        variant="ghost"
        color="neutral"
        @click="$emit('reset')"
      />
    </div>
  </form>
</template>

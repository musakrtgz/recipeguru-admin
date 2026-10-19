<script setup lang="ts">
withDefaults(
  defineProps<{ label: string, name: string, error?: string, disabled?: boolean, max?: number }>(),
  { max: 100 }
)
const items = defineModel<string[]>({ default: () => [''] })
function update(index: number, value: string) {
  items.value = items.value.map((item, position) => (position === index ? value : item))
}
function remove(index: number) {
  items.value = items.value.filter((_, position) => position !== index)
}
</script>

<template>
  <fieldset
    class="space-y-3"
    :disabled="disabled"
  >
    <legend class="mb-3 text-sm font-medium text-highlighted">
      {{ label }}
    </legend>
    <div
      v-for="(item, index) in items"
      :key="index"
      class="flex items-end gap-2"
    >
      <UiAppInput
        :model-value="item"
        :label="'Malzeme ' + (index + 1)"
        :name="name + '-' + index"
        :maxlength="200"
        :disabled="disabled"
        @update:model-value="update(index, $event)"
      />
      <UiAppButton
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        :aria-label="index + 1 + '. malzemeyi kaldır'"
        :disabled="disabled"
        @click="remove(index)"
      />
    </div>
    <p
      v-if="error"
      role="alert"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
    <UiAppButton
      label="Malzeme ekle"
      icon="i-lucide-plus"
      variant="soft"
      :disabled="disabled || items.length >= max"
      @click="items = [...items, '']"
    />
  </fieldset>
</template>

<script setup lang="ts">
import axios from 'axios'
import type { AdvertisementTarget, AdvertisementTargetPage } from '#shared/types/advertisements'
import type { ApiFailure } from '#shared/types/api'

const props = defineProps<{ type: 'recipe' | 'submitted_recipe' }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ selected: [value: AdvertisementTarget] }>()
const api = useApi()
const query = ref('')
const search = ref('')
const page = ref(1)
const data = ref<AdvertisementTargetPage | null>(null)
const loading = ref(false)
const error = ref('')
let controller: AbortController | undefined
let sequence = 0
async function load() {
  controller?.abort()
  controller = new AbortController()
  const current = ++sequence
  loading.value = true
  error.value = ''
  data.value = null
  try {
    const value = await api.request<AdvertisementTargetPage>(
      '/advertisements/targets',
      { params: { type: props.type, q: query.value, page: page.value }, signal: controller.signal },
      { error: false }
    )
    if (sequence === current && open.value) data.value = value
  } catch (failure) {
    if (sequence === current && !axios.isCancel(failure))
      error.value = (failure as ApiFailure).message
  } finally {
    if (sequence === current) loading.value = false
  }
}
function submit() {
  query.value = search.value.trim()
  if (page.value !== 1) page.value = 1
  else void load()
}
function select(value: AdvertisementTarget) {
  emit('selected', value)
  open.value = false
}
watch([open, () => props.type], () => {
  if (open.value) {
    query.value = ''
    search.value = ''
    page.value = 1
    void load()
  } else {
    sequence++
    controller?.abort()
    loading.value = false
  }
})
watch(page, () => {
  if (open.value) void load()
})
onBeforeUnmount(() => {
  sequence++
  controller?.abort()
})
</script>

<template>
  <UiAppModal
    v-model:open="open"
    :title="type === 'recipe' ? 'Hazır tarif seç' : 'Onaylı kullanıcı tarifi seç'"
    description="Reklama tıklandığında açılacak tarifi bulun."
  >
    <form
      class="mb-5 flex items-end gap-3"
      @submit.prevent="submit"
    >
      <UiAppInput
        v-model="search"
        label="Tarif ara"
        name="ad_target_search"
        placeholder="Tarif adı…"
        :maxlength="150"
      /><UiAppButton
        label="Ara"
        icon="i-lucide-search"
        type="submit"
        :loading="loading"
      />
    </form>
    <UiAppAlert
      v-if="error"
      title="Tarifler yüklenemedi"
      :description="error"
    >
      <template #actions>
        <UiAppButton
          label="Tekrar dene"
          variant="outline"
          color="neutral"
          @click="load"
        />
      </template>
    </UiAppAlert>
    <div
      v-else-if="loading"
      role="status"
      class="space-y-3"
    >
      <USkeleton
        v-for="index in 4"
        :key="index"
        class="h-16 w-full"
      />
    </div>
    <div
      v-else-if="data?.items.length"
      class="space-y-2"
    >
      <UiAppButton
        v-for="item in data.items"
        :key="item.id"
        block
        color="neutral"
        variant="outline"
        class="justify-start py-3 text-left whitespace-normal"
        @click="select(item)"
      >
        <span><span class="block font-medium">{{ item.title }}</span><span class="mt-1 block text-xs text-muted">#{{ item.id }} · {{ item.description }}</span></span>
      </UiAppButton>
      <div class="pt-4">
        <UiAppPagination
          v-model:page="page"
          :page-size="10"
          :total="data.total"
          :loading="loading"
        />
      </div>
    </div>
    <UiAppEmptyState
      v-else
      title="Tarif bulunamadı"
      description="Başka bir adla arayın. Kullanıcı tarifleri için onaylı kayıt gerekir."
      icon="i-lucide-search"
    />
    <template #footer>
      <UiAppButton
        label="Vazgeç"
        color="neutral"
        variant="outline"
        @click="open = false"
      />
    </template>
  </UiAppModal>
</template>

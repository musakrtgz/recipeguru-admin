<script setup lang="ts">
interface ImageItem {
  id: string
  src: string
  label: string
}
const props = withDefaults(defineProps<{ images: ImageItem[], label?: string, aspectRatio?: number }>(), { label: 'Tarif fotoğrafları' })
const active = ref(0)
const expanded = ref(false)
const failed = ref<string[]>([])
const current = computed(() => props.images[active.value])
watch(
  () => props.images.map(item => item.src).join('|'),
  () => {
    active.value = 0
    expanded.value = false
    failed.value = []
  }
)
function move(offset: number) {
  active.value = (active.value + offset + props.images.length) % props.images.length
}
</script>

<template>
  <section
    v-if="current"
    class="space-y-3"
    :aria-label="label"
  >
    <div class="flex items-center justify-between text-sm">
      <h3 class="font-semibold text-highlighted">
        Fotoğraflar
      </h3>
      <span class="text-muted">{{ active + 1 }} / {{ images.length }} · {{ current.label }}</span>
    </div>
    <UiAppAlert
      v-if="failed.includes(current.id)"
      title="Fotoğraf yüklenemedi"
      color="warning"
    >
      <template #actions>
        <UiAppButton
          label="Tekrar dene"
          variant="outline"
          color="neutral"
          @click="failed = failed.filter((id) => id !== current?.id)"
        />
      </template>
    </UiAppAlert>
    <button
      v-else
      type="button"
      class="block w-full rounded-xl bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
      :aria-label="current.label + ' fotoğrafını büyüt'"
      @click="expanded = true"
    >
      <img
        :key="current.src"
        :src="current.src"
        :alt="current.label"
        class="w-full rounded-xl object-contain"
        :class="aspectRatio ? 'h-auto' : 'h-64'"
        :style="aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined"
        @error="failed.push(current.id)"
      >
    </button>
    <div
      v-if="images.length > 1"
      class="flex items-center gap-2"
    >
      <UiAppButton
        icon="i-lucide-chevron-left"
        aria-label="Önceki fotoğraf"
        color="neutral"
        variant="ghost"
        @click="move(-1)"
      />
      <div class="flex min-w-0 flex-1 gap-2 overflow-x-auto p-1">
        <button
          v-for="(image, index) in images"
          :key="image.id"
          type="button"
          :aria-label="image.label"
          :aria-pressed="index === active"
          class="size-16 shrink-0 overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-primary"
          :class="index === active ? 'border-primary' : 'border-default'"
          @click="active = index"
        >
          <img
            :src="image.src"
            :alt="image.label"
            class="size-full object-cover"
            loading="lazy"
          >
        </button>
      </div>
      <UiAppButton
        icon="i-lucide-chevron-right"
        aria-label="Sonraki fotoğraf"
        color="neutral"
        variant="ghost"
        @click="move(1)"
      />
    </div>
    <UiAppModal
      v-model:open="expanded"
      :title="current.label"
      description="Tarif fotoğrafı"
      size="wide"
    >
      <img
        :src="current.src"
        :alt="current.label"
        class="max-h-[65vh] w-full rounded-xl object-contain"
      >
      <template #footer>
        <UiAppButton
          v-if="images.length > 1"
          label="Önceki"
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="outline"
          @click="move(-1)"
        />
        <UiAppButton
          v-if="images.length > 1"
          label="Sonraki"
          trailing-icon="i-lucide-chevron-right"
          color="neutral"
          variant="outline"
          @click="move(1)"
        />
        <UiAppButton
          label="Kapat"
          @click="expanded = false"
        />
      </template>
    </UiAppModal>
  </section>
</template>

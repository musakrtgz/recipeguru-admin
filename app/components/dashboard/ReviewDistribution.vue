<script setup lang="ts">
import type { RecipeStatus } from '#shared/types/api'

const props = defineProps<{
  data: Record<RecipeStatus, number> | null
  error?: string | null
}>()
const total = computed(() =>
  props.data ? props.data.pending + props.data.approved + props.data.rejected : 0
)
const segments = computed(() => {
  if (!props.data || !total.value) return { background: 'var(--ui-bg-accented)' }
  const approved = (props.data.approved / total.value) * 100
  const pending = (props.data.pending / total.value) * 100
  return {
    background: `conic-gradient(var(--ui-primary) 0% ${approved}%, color-mix(in srgb, var(--ui-primary) 35%, var(--ui-bg)) ${approved}% ${approved + pending}%, var(--ui-bg-accented) ${approved + pending}% 100%)`
  }
})
</script>

<template>
  <UiAppCard
    title="Topluluğun tarifleri"
    description="Tüm zamanlardaki inceleme durumu"
  >
    <UiAppAlert
      v-if="error"
      title="Dağılım yüklenemedi"
      :description="error"
    />
    <template v-else>
      <div
        class="relative mx-auto my-5 flex size-44 items-center justify-center rounded-full"
        :style="segments"
        role="img"
        :aria-label="`Toplam ${formatNumber(total)} topluluk tarifi`"
      >
        <div class="flex size-32 flex-col items-center justify-center rounded-full bg-default">
          <span class="text-3xl font-semibold">{{ data ? formatNumber(total) : '—' }}</span><span class="mt-1 text-xs text-muted">toplam tarif</span>
        </div>
      </div>
      <div class="mt-7 space-y-3">
        <div
          v-for="item in [
            { key: 'approved', label: 'Yayında', color: 'bg-primary' },
            {
              key: 'pending',
              label: 'İnceleme bekliyor',
              color: 'bg-primary/30'
            },
            { key: 'rejected', label: 'Reddedildi', color: 'bg-accented' }
          ]"
          :key="item.key"
          class="flex items-center gap-2.5 text-sm"
        >
          <span
            class="size-2 rounded-full"
            :class="item.color"
          /><span class="flex-1 text-muted">{{
            item.label
          }}</span><span class="font-semibold">{{ formatNumber(data?.[item.key as RecipeStatus]) }}</span>
        </div>
      </div>
    </template>
  </UiAppCard>
</template>

<script setup lang="ts">
const props = defineProps<{ items: { date: string, impressions: number, clicks: number }[] }>()
const maximum = computed(() =>
  Math.max(1, ...props.items.flatMap(item => [item.impressions, item.clicks]))
)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-5 text-xs text-muted">
      <span class="flex items-center gap-2"><span class="size-2 rounded-full bg-primary" />Gösterim</span><span class="flex items-center gap-2"><span class="size-2 rounded-full bg-info" />Tıklama</span>
    </div>
    <div
      class="overflow-x-auto rounded-xl border border-default p-4"
      role="img"
      aria-label="Günlere göre gösterim ve tıklama dağılımı. Sayısal değerler aşağıdaki tabloda yer alır."
    >
      <div
        class="flex h-44 items-end gap-1"
        :style="{ minWidth: Math.max(300, items.length * 18) + 'px' }"
      >
        <div
          v-for="item in items"
          :key="item.date"
          class="flex h-full min-w-3 flex-1 items-end gap-0.5"
          :title="`${item.date}: ${item.impressions} gösterim, ${item.clicks} tıklama`"
        >
          <div
            class="min-w-1 flex-1 rounded-t bg-primary"
            :style="{ height: (item.impressions / maximum) * 100 + '%' }"
          />
          <div
            class="min-w-1 flex-1 rounded-t bg-info"
            :style="{ height: (item.clicks / maximum) * 100 + '%' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

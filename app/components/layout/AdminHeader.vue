<script setup lang="ts">
defineEmits<{ menu: [] }>()
const route = useRoute()
const colorMode = useColorMode()
const title = computed(() =>
  route.path === '/recipes'
    ? 'Tarifler'
    : route.path === '/reviews'
      ? 'Tarif incelemeleri'
      : route.path === '/system'
        ? 'Tema ve sistem'
        : 'Genel bakış'
)
</script>

<template>
  <header
    class="flex h-20 items-center justify-between gap-4 border-b border-default bg-default px-5 lg:px-9"
  >
    <div class="flex items-center gap-3">
      <UiAppButton
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        aria-label="Menüyü aç"
        class="lg:hidden"
        @click="$emit('menu')"
      /><span class="hidden text-sm text-dimmed sm:inline">Çalışma alanı</span><UIcon
        name="i-lucide-chevron-right"
        class="hidden size-3 text-dimmed sm:block"
      /><span
        class="text-sm font-medium"
      >{{ title }}</span>
    </div>
    <div class="flex items-center gap-3">
      <UiAppBadge
        class="hidden sm:inline-flex"
        color="primary"
        dot
      >
        Yönetici alanı
      </UiAppBadge>
      <ClientOnly>
        <UiAppButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          aria-label="Açık ve koyu temayı değiştir"
          @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
        /><template #fallback>
          <span class="size-10" />
        </template>
      </ClientOnly>
    </div>
  </header>
</template>

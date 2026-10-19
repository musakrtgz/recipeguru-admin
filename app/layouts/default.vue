<script setup lang="ts">
const mobileMenu = ref(false)
const route = useRoute()
watch(
  () => route.path,
  () => {
    mobileMenu.value = false
  }
)
</script>

<template>
  <div class="min-h-screen">
    <div class="fixed inset-y-0 left-0 z-20 hidden w-64 lg:block">
      <LayoutAdminSidebar />
    </div>
    <USlideover
      v-model:open="mobileMenu"
      side="left"
      title="Ana menü"
      description="RecipeGuru yönetim menüsü"
      :ui="{ content: 'max-w-72', body: 'p-0 sm:p-0' }"
    >
      <template #body>
        <LayoutAdminSidebar @navigate="mobileMenu = false" />
      </template>
    </USlideover>
    <div class="lg:pl-64">
      <LayoutAdminHeader @menu="mobileMenu = true" />
      <main
        id="main-content"
        class="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-9"
      >
        <slot />
      </main>
      <footer
        class="mx-auto flex max-w-[1600px] flex-wrap justify-between gap-2 px-5 py-6 text-xs text-dimmed sm:px-8 lg:px-9"
      >
        <span>RecipeGuru · Birlikte daha lezzetli.</span><span>Yalnızca yetkili yöneticiler için</span>
      </footer>
    </div>
  </div>
</template>

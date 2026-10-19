<script setup lang="ts">
import { adminConfig } from '#shared/config/admin'

const route = useRoute()
const emit = defineEmits<{ navigate: [] }>()
const { user, logout } = useAuth()
const environment = useRuntimeConfig().public.environment
const confirmLogout = ref(false)
const loggingOut = ref(false)
async function exit() {
  loggingOut.value = true
  try {
    await logout()
  } catch {
    // Ortak API istemcisi çıkış hatasını bildirir; yerel oturum yine temizlenir.
  } finally {
    loggingOut.value = false
    confirmLogout.value = false
  }
}
</script>

<template>
  <aside class="flex h-full flex-col border-r border-default bg-[var(--admin-sidebar)] px-4 py-5">
    <NuxtLink
      to="/"
      aria-label="RecipeGuru ana sayfa"
      @click="emit('navigate')"
    ><BrandLogo /></NuxtLink>
    <div class="mt-5 mb-5 flex items-center gap-2.5 rounded-xl border border-default p-2.5">
      <div class="brand-soft flex size-8 items-center justify-center rounded-lg">
        <UIcon
          name="i-lucide-cooking-pot"
          class="brand-ink size-4"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold">
          RecipeGuru
        </p>
        <p class="mt-0.5 text-[10px] text-muted">
          {{ environment === 'production' ? 'Canlı ortam' : 'Geliştirme ortamı' }}
        </p>
      </div>
      <UIcon
        name="i-lucide-lock-keyhole"
        class="size-3.5 text-dimmed"
      />
    </div>
    <p class="mb-2 px-3 text-[9px] font-semibold tracking-[.16em] text-dimmed uppercase">
      Çalışma alanı
    </p>
    <nav
      aria-label="Ana menü"
      class="space-y-0.5"
    >
      <NuxtLink
        v-for="item in adminConfig.navigation"
        :key="item.to"
        :to="item.to"
        :aria-current="route.path === item.to ? 'page' : undefined"
        class="sidebar-link"
        :class="{ active: route.path === item.to }"
        @click="emit('navigate')"
      >
        <UIcon
          :name="item.icon"
          class="nav-icon size-4 shrink-0"
        /><span>{{ item.label }}</span>
        <span
          v-if="route.path === item.to"
          class="ml-auto size-1.5 rounded-full bg-primary"
        />
      </NuxtLink>
    </nav>
    <p class="mt-5 mb-2 px-3 text-[9px] font-semibold tracking-[.16em] text-dimmed uppercase">
      Sonraki modüller
    </p>
    <div
      v-for="item in adminConfig.upcoming"
      :key="item.label"
      class="flex min-h-9 items-center gap-2.5 px-3 py-2 text-dimmed"
    >
      <UIcon
        :name="item.icon"
        class="size-4 shrink-0"
      /><span
        class="min-w-0 flex-1 truncate text-xs"
      >{{ item.label }}</span><span class="text-[8px] tracking-wide">YAKINDA</span>
    </div>
    <div class="mt-auto pt-6">
      <div class="brand-soft mb-4 rounded-xl p-3">
        <UIcon
          name="i-lucide-sprout"
          class="brand-ink mb-1.5 size-5"
        />
        <p class="text-xs font-semibold">
          Bir tutam ilham.
        </p>
        <p class="mt-1 text-[11px] leading-5 text-muted">
          Her güzel tarifin arkasında, onu önemseyen bir topluluk var.
        </p>
      </div>
      <div class="flex items-center gap-2.5 border-t border-default pt-4">
        <div
          class="brand-soft flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        >
          {{ initials(user?.name || '', user?.surname) }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-semibold">
            {{ user?.name }} {{ user?.surname }}
          </p>
          <p class="mt-0.5 text-[10px] text-muted">
            Yönetici
          </p>
        </div>
        <UiAppButton
          icon="i-lucide-log-out"
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label="Çıkış yap"
          @click="confirmLogout = true"
        />
      </div>
    </div>
    <UiAppModal
      v-model:open="confirmLogout"
      title="Oturum kapatılsın mı?"
      description="Yönetim paneline dönmek için tekrar giriş yapmanız gerekecek."
      :busy="loggingOut"
    >
      <p class="text-sm text-muted">
        Güvenli çıkış, bu panele ait erişim tokenını da iptal eder.
      </p>
      <template #footer>
        <UiAppButton
          label="Vazgeç"
          color="neutral"
          variant="outline"
          :disabled="loggingOut"
          @click="confirmLogout = false"
        /><UiAppButton
          label="Çıkış yap"
          :loading="loggingOut"
          @click="exit"
        />
      </template>
    </UiAppModal>
  </aside>
</template>

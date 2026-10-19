<script setup lang="ts">
import { loginSchema, safeRedirect } from '#shared/utils/contracts'
import type { ApiFailure } from '#shared/types/api'

definePageMeta({ layout: 'auth' })
useSeoMeta({
  title: 'Giriş yap',
  description: 'RecipeGuru güvenli yönetim paneli.'
})
const route = useRoute()
const auth = useAuth()
const form = reactive({ email: '', password: '' })
const errors = ref<Record<string, string[]>>({})
const errorMessage = ref('')
const busy = ref(false)
const showPassword = ref(false)
async function submit() {
  if (busy.value) return
  errors.value = {}
  errorMessage.value = ''
  const result = loginSchema.safeParse(form)
  if (!result.success) {
    errors.value = result.error.flatten().fieldErrors
    return
  }
  busy.value = true
  try {
    await auth.login(result.data.email, result.data.password)
    form.password = ''
    await navigateTo(safeRedirect(route.query.redirect))
  } catch (error) {
    const failure = error as ApiFailure
    errorMessage.value = failure.message
    errors.value = failure.errors
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-screen bg-default lg:grid-cols-2">
    <section
      class="login-grid brand-soft relative hidden flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16"
    >
      <BrandLogo />
      <div class="mx-auto w-full max-w-lg py-10">
        <UiAppBadge color="primary">
          <UIcon
            name="i-lucide-sparkles"
            class="mr-1 size-3"
          />Topluluğun mutfağı
        </UiAppBadge>
        <h1
          class="mt-6 text-5xl leading-[1.15] font-semibold tracking-tight text-highlighted xl:text-6xl"
        >
          İlhamı büyüt.<br>Lezzeti <span class="brand-ink">paylaş.</span>
        </h1>
        <p class="mt-5 max-w-sm text-base leading-7 text-muted">
          Tarifleri, insanları ve güzel fikirleri bir araya getiren her şey, burada senin elinde.
        </p>
        <BrandLoginVisual class="mt-3" />
      </div>
      <div class="flex items-center justify-between text-xs text-muted">
        <span>RecipeGuru Yönetim</span><span>Sevgiyle hazırlanan tarifler için.</span>
      </div>
    </section>
    <section class="relative flex items-center justify-center px-6 py-14 sm:px-12">
      <div class="absolute top-7 right-7">
        <UColorModeButton />
      </div>
      <div class="w-full max-w-sm">
        <BrandLogo class="mb-16 lg:hidden" />
        <div class="brand-soft mb-7 flex size-12 items-center justify-center rounded-2xl">
          <UIcon
            name="i-lucide-key-round"
            class="brand-ink size-6"
          />
        </div>
        <p class="brand-ink mb-3 text-[10px] font-semibold tracking-[.18em] uppercase">
          RecipeGuru Admin
        </p>
        <h2 class="text-3xl font-semibold tracking-tight text-highlighted">
          Yeniden hoş geldin.
        </h2>
        <p class="mt-3 text-sm leading-6 text-muted">
          Yönetici hesabınla giriş yap,<br>topluluğun için güzel şeyler hazırlayalım.
        </p>
        <UiAppAlert
          v-if="route.query.connection"
          class="mt-6"
          title="API bağlantısı kurulamadı"
          description="API'nin çalıştığını kontrol edip giriş yapmayı tekrar deneyin."
        />
        <form
          class="mt-8 space-y-5"
          novalidate
          @submit.prevent="submit"
        >
          <UiAppInput
            v-model="form.email"
            label="E-posta adresi"
            name="email"
            type="email"
            icon="i-lucide-mail"
            placeholder="isim@recipeguru.app"
            autocomplete="username"
            :error="errors.email?.[0]"
            :disabled="busy"
            required
          />
          <UiAppInput
            v-model="form.password"
            label="Şifre"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            icon="i-lucide-lock-keyhole"
            placeholder="Şifrenizi yazın"
            autocomplete="current-password"
            :error="errors.password?.[0]"
            :disabled="busy"
            required
          >
            <template #trailing>
              <UiAppButton
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                type="button"
                size="xs"
                color="neutral"
                variant="ghost"
                :aria-label="showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              />
            </template>
          </UiAppInput>
          <UiAppAlert
            v-if="errorMessage"
            title="Giriş yapılamadı"
            :description="errorMessage"
          />
          <UiAppButton
            type="submit"
            label="Giriş yap"
            trailing-icon="i-lucide-arrow-right"
            block
            size="xl"
            :loading="busy"
            class="mt-2 justify-center py-3"
          />
        </form>
        <div class="mt-7 flex items-start gap-2.5 rounded-xl border border-default p-4">
          <UIcon
            name="i-lucide-shield-check"
            class="mt-0.5 size-4 shrink-0 text-muted"
          />
          <p class="text-xs leading-5 text-muted">
            Bu alan yalnızca admin yetkisine sahip hesaplara açıktır. Erişim için sistem
            yöneticinizle iletişime geçin.
          </p>
        </div>
        <p class="mt-9 text-center text-[11px] text-dimmed">
          Güvenli oturum. Özenle yönetilen bir topluluk.
        </p>
      </div>
    </section>
  </div>
</template>

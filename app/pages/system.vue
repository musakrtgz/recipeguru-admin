<script setup lang="ts">
import { adminConfig } from '#shared/config/admin'

useSeoMeta({ title: 'Tema ve sistem' })
const environment = useRuntimeConfig().public.environment
const toast = useToast()
const example = ref('')
const modal = ref(false)
</script>

<template>
  <div>
    <LayoutPageHeading
      eyebrow="Panel altyapısı"
      title="Tema ve sistem"
      description="Tek bir görsel dil. Her ekranda aynı deneyim."
    />
    <div class="grid gap-6 xl:grid-cols-2">
      <UiAppCard
        title="Marka ayarları"
        description="Temanın tek kaynağı: shared/config/admin.ts"
      >
        <div class="brand-soft mb-6 rounded-xl p-5">
          <BrandLogo />
        </div>
        <dl class="space-y-4 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted">
              Ana renk paleti
            </dt>
            <dd class="font-medium">
              {{ adminConfig.theme.primary }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">
              Nötr palet
            </dt>
            <dd class="font-medium">
              {{ adminConfig.theme.neutral }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">
              Görünüm
            </dt>
            <dd>Açık / koyu tema</dd>
          </div>
        </dl>
        <p class="mt-6 text-xs leading-6 text-muted">
          Ayar dosyasındaki theme.primary değerini değiştirdiğinde menü, kart, form, buton ve modal
          vurguları aynı palete geçer.
        </p>
      </UiAppCard>
      <UiAppCard
        title="Güvenli bağlantı"
        description="Sunucuda yönetilen kimlik doğrulama"
      >
        <div class="mb-6">
          <UiAppBadge
            color="primary"
            dot
          >
            {{ environment === 'production' ? 'Canlı ortam' : 'Geliştirme ortamı' }}
          </UiAppBadge>
        </div>
        <ul class="space-y-4 text-sm text-muted">
          <li class="flex gap-3">
            <UIcon
              name="i-lucide-check"
              class="size-5 text-success"
            />Yalnız aktif admin hesapları
          </li>
          <li class="flex gap-3">
            <UIcon
              name="i-lucide-check"
              class="size-5 text-success"
            />Şifreli ve HttpOnly oturum
            çerezi
          </li>
          <li class="flex gap-3">
            <UIcon
              name="i-lucide-check"
              class="size-5 text-success"
            />Sunucuda Axios ile Laravel
            bağlantısı
          </li>
          <li class="flex gap-3">
            <UIcon
              name="i-lucide-check"
              class="size-5 text-success"
            />Her korunan istekte yetki
            kontrolü
          </li>
        </ul>
      </UiAppCard>
      <UiAppCard
        title="Ortak bileşenler"
        description="Formlar ve eylemler için tekrar kullanılabilir parçalar"
      >
        <div class="space-y-5">
          <UiAppInput
            v-model="example"
            label="Örnek alan"
            name="example"
            placeholder="Bir şeyler yazın…"
            icon="i-lucide-pencil"
          />
          <div class="flex flex-wrap gap-3">
            <UiAppButton
              label="Birincil buton"
              @click="toast.add({ title: 'Örnek başarı bildirimi', color: 'success' })"
            /><UiAppButton
              label="İkincil buton"
              color="neutral"
              variant="outline"
              @click="modal = true"
            /><UiAppButton
              label="Pasif buton"
              disabled
            />
          </div>
          <div class="flex gap-2">
            <UiAppBadge color="success">
              Yayında
            </UiAppBadge><UiAppBadge color="warning">
              İncelemede
            </UiAppBadge><UiAppBadge color="error">
              Reddedildi
            </UiAppBadge>
          </div>
          <UiAppAlert
            title="Bilgi ve geri bildirim"
            description="API hata ve başarı mesajları ortak bildirim sistemiyle gösterilir."
            color="info"
            icon="i-lucide-info"
          />
        </div>
      </UiAppCard>
      <UiAppCard
        title="Yeni modüller için hazır"
        description="Aynı altyapıyla geliştirmeye devam"
      >
        <UiAppEmptyState
          title="Bir sonraki güzel fikir?"
          description="Kullanıcı, kampanya ve bildirim ekranları bu ortak bileşenlerle geliştirilecek."
          icon="i-lucide-blocks"
        >
          <UiAppButton
            label="Örnek modalı aç"
            variant="outline"
            color="neutral"
            @click="modal = true"
          />
        </UiAppEmptyState>
      </UiAppCard>
    </div>
    <UiAppModal
      v-model:open="modal"
      title="Her detayda aynı tasarım"
      description="Bu, ortak modal bileşeninin bir önizlemesidir."
    >
      <p class="text-sm leading-7 text-muted">
        Klavyeyle kullanılabilir, odağı korur ve tema rengini merkezi ayardan alır. Yeni sayfalarda
        aynı bileşeni kullanacağız.
      </p>
      <template #footer>
        <UiAppButton
          label="Tamam"
          @click="modal = false"
        />
      </template>
    </UiAppModal>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()
</script>

<template>
  <UApp>
    <div class="flex min-h-screen items-center justify-center p-6">
      <UiAppCard class="w-full max-w-lg">
        <BrandLogo class="mb-8" /><UiAppEmptyState
          :title="error.statusCode === 404 ? 'Bu sayfa bulunamadı.' : 'Bir şeyler yolunda gitmedi.'"
          description="Ana sayfaya dönüp yeniden deneyebilirsin."
          icon="i-lucide-compass"
        >
          <UiAppButton
            label="Ana sayfaya dön"
            @click="clearError({ redirect: '/' })"
          />
        </UiAppEmptyState>
      </UiAppCard>
    </div>
  </UApp>
</template>

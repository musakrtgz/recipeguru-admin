<script setup lang="ts">
import { tr } from '@nuxt/ui/locale'
import { adminConfig } from '#shared/config/admin'

const darkTokens = Object.entries(adminConfig.theme.dark)
  .map(([name, value]) => `--admin-dark-${name}: ${value};`)
  .join(' ')

useHead({
  style: [{ innerHTML: `:root { --ui-radius: ${adminConfig.theme.radius}; ${darkTokens} }` }]
})
</script>

<template>
  <UApp
    :locale="tr"
    :toaster="{ position: 'top-right', duration: 5000 }"
  >
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </UApp>
</template>

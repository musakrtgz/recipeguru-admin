export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui'],
  ssr: true,
  devtools: { enabled: false },
  app: {
    head: {
      htmlAttrs: { lang: 'tr' },
      titleTemplate: '%s · RecipeGuru',
      meta: [{ name: 'robots', content: 'noindex,nofollow' }],
      link: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }]
    }
  },
  css: ['~/assets/css/main.css'],
  colorMode: { preference: 'light', fallback: 'light' },
  runtimeConfig: {
    sessionPassword: '',
    siteUrl: 'http://localhost:3000',
    apiEnvironment: 'development',
    apiBaseDev: 'https://recipev3.test/api',
    apiBaseProd: 'https://api.recipeguru.app/api',
    apiCaFile: '',
    public: { environment: 'development' }
  },
  routeRules: {
    '/**': {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
        'X-Frame-Options': 'DENY'
      }
    }
  },
  compatibilityDate: '2026-06-30',
  typescript: { strict: true },
  eslint: {
    config: { stylistic: { commaDangle: 'never', braceStyle: '1tbs' } }
  }
})

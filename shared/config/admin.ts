/** Panelin marka ve görünüm ayarlarının tek kaynağı. */
export const adminConfig = {
  brand: { name: 'RecipeGuru', panelName: 'Yönetim paneli', monogram: 'RG' },
  theme: {
    primary: 'amber',
    neutral: 'stone',
    radius: '0.3rem',
    dark: {
      canvas: '#0d1422',
      sidebar: '#121d2e',
      surface: '#1b283d',
      muted: '#162237',
      elevated: '#263951',
      accented: '#344a66',
      border: '#354b67',
      text: '#e5edf8',
      secondary: '#b8c8e0',
      dimmed: '#91a7c6',
      highlighted: '#f8fbff'
    }
  },
  session: { maxAge: 60 * 60 * 8, cookieName: 'recipe_admin_session' },
  pagination: { pageSize: 10 },
  navigation: [
    { label: 'Genel bakış', icon: 'i-lucide-layout-dashboard', to: '/' },
    { label: 'Tarifler', icon: 'i-lucide-book-open', to: '/recipes' },
    { label: 'AI Yayınları', icon: 'i-lucide-sparkles', to: '/ai-publications' },
    { label: 'Reklam kampanyaları', icon: 'i-lucide-megaphone', to: '/advertisements' },
    {
      label: 'Tarif incelemeleri',
      icon: 'i-lucide-notebook-pen',
      to: '/reviews'
    },
    {
      label: 'Tema ve sistem',
      icon: 'i-lucide-sliders-horizontal',
      to: '/system'
    }
  ],
  upcoming: [
    { label: 'Kullanıcılar', icon: 'i-lucide-users-round' },
    { label: 'Bildirimler', icon: 'i-lucide-bell' }
  ]
} as const

import { adminConfig } from '#shared/config/admin'

export default defineAppConfig({
  ui: {
    colors: {
      primary: adminConfig.theme.primary,
      neutral: adminConfig.theme.neutral
    },
    button: {
      slots: { base: 'font-semibold rounded-xl cursor-pointer' },
      defaultVariants: { size: 'lg' }
    },
    input: { slots: { base: 'rounded-xl' }, defaultVariants: { size: 'xl' } },
    select: { slots: { base: 'rounded-xl' }, defaultVariants: { size: 'lg' } },
    card: {
      slots: {
        root: 'rounded-2xl shadow-none',
        header: 'border-default',
        footer: 'border-default'
      }
    },
    modal: {
      slots: {
        content: 'rounded-2xl',
        header: 'p-6',
        body: 'p-6',
        footer: 'p-6'
      }
    },
    table: {
      slots: {
        th: 'text-xs font-semibold text-muted uppercase tracking-wider',
        td: 'py-4 text-sm'
      }
    },
    navigationMenu: { slots: { link: 'rounded-lg py-2 text-sm' } }
  }
})

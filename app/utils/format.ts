export const formatNumber = (value: number | undefined | null) =>
  value == null ? '—' : new Intl.NumberFormat('tr-TR').format(value)
export const formatCurrency = (value: number | undefined, currency = 'TRY') =>
  value == null
    ? '—'
    : new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
      }).format(value)
export const formatDate = (value: string, short = false) =>
  new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: short ? 'short' : 'long',
    ...(short ? {} : { year: 'numeric' })
  }).format(new Date(value))
export const initials = (name: string, surname?: string | null) =>
  ((name[0] || '') + (surname?.[0] || '')).toLocaleUpperCase('tr-TR')

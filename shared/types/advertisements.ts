export type AdDestinationType = 'external' | 'recipe' | 'submitted_recipe'
export interface Advertisement {
  id: number
  title: string
  sponsor_name: string
  body: string | null
  cta_label: string | null
  destination:
    { type: 'external', url: string } | { type: 'recipe' | 'submitted_recipe', id: number }
  image: { id: string }
  locale: 'tr' | 'en' | null
  is_active: boolean
  starts_at: string
  ends_at: string
  weight: number
  daily_user_cap: number
  max_impressions: number | null
  impressions_count: number
  clicks_count: number
  ctr_percent: number
  revision: number
  deleted_at: string | null
}
export interface AdvertisementPage {
  items: Advertisement[]
  page: number
  pageSize: number
  total: number
  lastPage: number
}
export interface AdvertisementSettings {
  enabled: boolean
  organic_interval: number
}
export interface AdvertisementReport {
  advertisement_id: number
  from: string
  to: string
  timezone: string
  impressions: number
  clicks: number
  unique_viewers: number
  attributed_clicks: number
  ctr_percent: number
  lifetime: { impressions: number, clicks: number }
  daily: { date: string, impressions: number, clicks: number }[]
}
export interface AdvertisementDraft {
  title: string
  sponsor_name: string
  body: string
  cta_label: string
  destination_type: AdDestinationType
  destination_id: string
  external_url: string
  locale: string
  is_active: boolean
  starts_at: string
  ends_at: string
  weight: string
  daily_user_cap: string
  max_impressions: string
}
export interface AdvertisementTarget {
  id: number
  title: string
  description: string
}
export interface AdvertisementTargetPage {
  items: AdvertisementTarget[]
  page: number
  total: number
  lastPage: number
}

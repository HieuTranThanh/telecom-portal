import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { APP_NAME } from '@/constants'

export interface PortalSettings {
  portal_name: string
  logo_url: string
  support_email: string
  support_phone: string
  default_page_size: number
  section_page_size: number
  health_check_timeout: number
  quick_access_limit: number
}

export const DEFAULT_SETTINGS: PortalSettings = {
  portal_name: APP_NAME,
  logo_url: '',
  support_email: 'kythuat@company.vn',
  support_phone: '18001234',
  default_page_size: 20,
  section_page_size: 8,
  health_check_timeout: 10000,
  quick_access_limit: 12,
}

export function usePortalSettings() {
  return useQuery({
    queryKey: ['portal_settings'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('key, value')
      if (!data || data.length === 0) return DEFAULT_SETTINGS
      const map = Object.fromEntries(
        (data as { key: string; value: unknown }[]).map(s => [s.key, s.value])
      )
      return { ...DEFAULT_SETTINGS, ...map } as PortalSettings
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useDynamicMeta() {
  const { data: settings } = usePortalSettings()

  useEffect(() => {
    const logoUrl = settings?.logo_url?.trim()
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    if (logoUrl) {
      link.href = logoUrl
      link.removeAttribute('type')
    } else {
      link.href = '/favicon.png'
      link.type = 'image/png'
    }
  }, [settings?.logo_url])

  useEffect(() => {
    const name = settings?.portal_name?.trim()
    if (name) document.title = name
  }, [settings?.portal_name])
}

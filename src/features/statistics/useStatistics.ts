import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { DashboardStats, Link } from '@/types'

export const statsKeys = {
  all: ['stats'] as const,
  dashboard: () => [...statsKeys.all, 'dashboard'] as const,
  public: () => [...statsKeys.all, 'public'] as const,
}

export function usePublicStats() {
  return useQuery({
    queryKey: statsKeys.public(),
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('links')
        .select('health_status, is_internal', { count: 'exact' })
        .eq('is_active', true)
        .limit(10000)
      if (error) throw error
      const rows = data ?? []
      const external = rows.filter(l => !l.is_internal)
      return {
        total: count ?? 0,
        online: external.filter(l => l.health_status === 'online').length,
        offline: external.filter(l => l.health_status === 'offline').length,
        unknown: external.filter(l => l.health_status === 'unknown').length,
        vpn: rows.filter(l => l.is_internal).length,
      }
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: statsKeys.dashboard(),
    queryFn: async (): Promise<DashboardStats> => {
      const [linksRes, categoriesRes, metricsRes, topLinksRes, errorsRes, recentRes] =
        await Promise.all([
          supabase.from('links').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('categories').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('links').select('click_count, health_status, business_status, is_internal').eq('is_active', true).limit(10000),
          supabase.from('links').select('id, name, slug, click_count, category:categories(name)').eq('is_active', true).gt('click_count', 0).order('click_count', { ascending: false }).limit(10),
          supabase.from('links').select('*, category:categories(*)').eq('is_active', true).eq('is_internal', false).eq('health_status', 'offline').order('last_checked_at', { ascending: false }).limit(5),
          supabase.from('links').select('*, category:categories(*)').eq('is_active', true).order('updated_at', { ascending: false }).limit(5),
        ])

      const rows = metricsRes.data || []
      const totalClicks = rows.reduce((sum, l) => sum + (l.click_count || 0), 0)
      const internalLinks = rows.filter(l => l.is_internal).length
      const externalStatuses = rows.filter(l => !l.is_internal)
      const onlineLinks = externalStatuses.filter(l => l.health_status === 'online').length
      const offlineLinks = externalStatuses.filter(l => l.health_status === 'offline').length
      const unknownLinks = externalStatuses.filter(l => l.health_status === 'unknown').length
      const suspendedLinks = rows.filter(l => l.business_status === 'suspended').length

      return {
        total_links: linksRes.count ?? 0,
        total_categories: categoriesRes.count ?? 0,
        total_clicks: totalClicks,
        internal_links: internalLinks,
        online_links: onlineLinks,
        offline_links: offlineLinks,
        unknown_links: unknownLinks,
        suspended_links: suspendedLinks,
        top_links: (topLinksRes.data || []).map(l => ({
          id: l.id,
          name: l.name,
          slug: l.slug,
          click_count: l.click_count,
          category_name: (l.category as { name?: string } | null)?.name ?? null,
        })),
        recent_errors: (errorsRes.data || []) as Link[],
        recently_updated: (recentRes.data || []) as Link[],
      }
    },
    staleTime: 1000 * 60,
  })
}

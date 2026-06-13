import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Link, LinkFilters } from '@/types'
import { LinkFormValues } from '@/lib/validators'
import { DEFAULT_PAGE_SIZE, HEALTH_CHECK_TIMEOUT_MS } from '@/constants'
import { slugify, sanitizeSearch } from '@/lib/utils'
import { statsKeys } from '@/features/statistics/useStatistics'

export const linkKeys = {
  all: ['links'] as const,
  lists: () => [...linkKeys.all, 'list'] as const,
  list: (filters: LinkFilters) => [...linkKeys.lists(), filters] as const,
  details: () => [...linkKeys.all, 'detail'] as const,
  detail: (slug: string) => [...linkKeys.details(), slug] as const,
  featured: (limit?: number) => [...linkKeys.all, 'featured', limit ?? 8] as const,
  frequent: (limit?: number) => [...linkKeys.all, 'frequent', limit ?? 8] as const,
  recent: (limit?: number) => [...linkKeys.all, 'recent', limit ?? 8] as const,
  quickAccess: (limit?: number) => [...linkKeys.all, 'quick-access', limit ?? 12] as const,
}

// Admin queries use a separate key prefix so we can invalidate them independently
export const adminLinkKeys = {
  all: ['admin', 'links'] as const,
}

type RawLink = Link & { link_tags?: { tag: unknown }[]; link_references?: unknown[] }

function mapLinkWithTags(item: RawLink): Link {
  return {
    ...item,
    tags: (item.link_tags?.map((lt: { tag: unknown }) => lt.tag).filter(Boolean) || []) as Link['tags'],
    references: (item.link_references || []) as Link['references'],
  }
}

export async function getTagMatchingLinkIds(search: string): Promise<string[]> {
  try {
    const { data: matchingTags } = await supabase.from('tags').select('id').ilike('name', `%${search}%`)
    const tagIds = matchingTags?.map(t => t.id) ?? []
    if (tagIds.length === 0) return []
    const { data: linkTags } = await supabase.from('link_tags').select('link_id').in('tag_id', tagIds)
    return [...new Set((linkTags ?? []).map(lt => lt.link_id as string))]
  } catch {
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQuery(base: any, filters: LinkFilters, tagMatchingLinkIds: string[] = []) {
  let q = base
  const search = filters.search ? sanitizeSearch(filters.search) : undefined
  if (search) {
    const baseFilter = `name.ilike.%${search}%,description.ilike.%${search}%,url.ilike.%${search}%`
    if (tagMatchingLinkIds.length > 0) {
      q = q.or(`${baseFilter},id.in.(${tagMatchingLinkIds.join(',')})`)
    } else {
      q = q.or(baseFilter)
    }
  }
  if (filters.no_category) q = q.is('category_id', null)
  else if (filters.category_id) q = q.eq('category_id', filters.category_id)
  if (filters.business_status && filters.business_status !== 'all') q = q.eq('business_status', filters.business_status)
  if (filters.health_status && filters.health_status !== 'all') q = q.eq('health_status', filters.health_status)
  if (filters.no_attributes) {
    q = q.eq('is_featured', false).eq('is_frequent', false).eq('is_quick_access', false).eq('is_internal', false)
  } else {
    if (filters.is_featured !== undefined) q = q.eq('is_featured', filters.is_featured)
    if (filters.is_frequent !== undefined) q = q.eq('is_frequent', filters.is_frequent)
    if (filters.is_quick_access !== undefined) q = q.eq('is_quick_access', filters.is_quick_access)
    if (filters.is_internal !== undefined) q = q.eq('is_internal', filters.is_internal)
    if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)
  }

  switch (filters.sort) {
    case 'name_asc': q = q.order('name', { ascending: true }); break
    case 'name_desc': q = q.order('name', { ascending: false }); break
    case 'click_count_asc': q = q.order('click_count', { ascending: true }); break
    case 'click_count_desc': q = q.order('click_count', { ascending: false }); break
    case 'updated_asc': q = q.order('updated_at', { ascending: true }); break
    case 'updated_desc': q = q.order('updated_at', { ascending: false }); break
    case 'frequent': q = q.order('is_frequent', { ascending: false }).order('click_count', { ascending: false }); break
    default: q = q.order('updated_at', { ascending: false })
  }
  return q
}

export function useLinks(filters: LinkFilters = {}, page = 1, pageSize = DEFAULT_PAGE_SIZE, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...linkKeys.list(filters), page, pageSize],
    enabled: opts?.enabled !== false,
    queryFn: async () => {
      const search = filters.search ? sanitizeSearch(filters.search) : undefined
      const tagIds = search ? await getTagMatchingLinkIds(search) : []

      const base = supabase
        .from('links')
        .select('*, category:categories(*), link_tags(tag:tags(*))', { count: 'exact' })
        .eq('is_active', true)
        .range((page - 1) * pageSize, page * pageSize - 1)

      const { data, error, count } = await buildQuery(base, filters, tagIds)
      if (error) throw error

      const links = ((data || []) as RawLink[]).map(mapLinkWithTags)
      return { links, total: count ?? 0 }
    },
  })
}

export function useAllLinksAdmin(filters: LinkFilters = {}, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: [...adminLinkKeys.all, filters, page, pageSize],
    queryFn: async () => {
      const search = filters.search ? sanitizeSearch(filters.search) : undefined
      const tagIds = search ? await getTagMatchingLinkIds(search) : []

      const base = supabase
        .from('links')
        .select('*, category:categories(*), link_tags(tag:tags(*)), link_references(*)', { count: 'exact' })
        .range((page - 1) * pageSize, page * pageSize - 1)

      const { data, error, count } = await buildQuery(base, filters, tagIds)
      if (error) throw error

      const links = ((data || []) as RawLink[]).map(mapLinkWithTags)
      return { links, total: count ?? 0 }
    },
  })
}

export function useLink(slug: string) {
  return useQuery({
    queryKey: linkKeys.detail(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*, category:categories(*), link_tags(tag:tags(*)), link_references(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      if (error) throw error
      return mapLinkWithTags(data as RawLink)
    },
    enabled: !!slug,
  })
}

export function useFeaturedLinks(limit = 8) {
  return useQuery({
    queryKey: linkKeys.featured(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*, category:categories(*), link_tags(tag:tags(*))')
        .eq('is_active', true)
        .eq('is_featured', true)
        .eq('business_status', 'active')
        .order('updated_at', { ascending: false })
        .limit(limit + 1)
      if (error) throw error
      return ((data || []) as RawLink[]).map(mapLinkWithTags)
    },
  })
}

export function useFrequentLinks(limit = 8) {
  return useQuery({
    queryKey: linkKeys.frequent(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*, category:categories(*), link_tags(tag:tags(*))')
        .eq('is_active', true)
        .eq('is_frequent', true)
        .eq('business_status', 'active')
        .order('click_count', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(limit + 1)
      if (error) throw error
      return ((data || []) as RawLink[]).map(mapLinkWithTags)
    },
  })
}

export function useQuickAccessLinks(limit = 12) {
  return useQuery({
    queryKey: linkKeys.quickAccess(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*, category:categories(*), link_tags(tag:tags(*))')
        .eq('is_active', true)
        .eq('is_quick_access', true)
        .eq('business_status', 'active')
        .order('quick_access_order', { ascending: true })
        .limit(limit + 1)
      if (error) throw error
      return ((data || []) as RawLink[]).map(mapLinkWithTags)
    },
  })
}

export function useReorderQuickAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const results = await Promise.allSettled(
        orderedIds.map((id, idx) =>
          supabase.from('links').update({ quick_access_order: (idx + 1) * 10 }).eq('id', id)
        )
      )
      for (const r of results) {
        if (r.status === 'rejected') throw r.reason
        if (r.value.error) throw r.value.error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
    },
    onError: () => toast.error('Không thể lưu thứ tự mới'),
  })
}

export function useLinksByIds(ids: string[]) {
  const sortedIds = [...ids].sort()
  return useQuery({
    queryKey: [...linkKeys.all, 'by-ids', sortedIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*, category:categories(*), link_tags(tag:tags(*))')
        .in('id', ids)
        .eq('is_active', true)
      if (error) throw error
      return ((data || []) as RawLink[]).map(mapLinkWithTags)
    },
    enabled: ids.length > 0,
  })
}

export function useRecentlyUpdatedLinks(limit = 8) {
  return useQuery({
    queryKey: linkKeys.recent(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*, category:categories(*), link_tags(tag:tags(*))')
        .eq('is_active', true)
        .eq('business_status', 'active')
        .order('updated_at', { ascending: false })
        .limit(limit + 1)
      if (error) throw error
      return ((data || []) as RawLink[]).map(mapLinkWithTags)
    },
  })
}

export function useCreateLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: LinkFormValues) => {
      const { tags, references, health_status_override, ...linkData } = values
      const slug = `${slugify(linkData.name)}-${Date.now()}`
      const { data, error } = await supabase
        .from('links')
        .insert({
          ...linkData,
          slug,
          ...(linkData.health_check_exempt ? { health_status: health_status_override } : {}),
        })
        .select()
        .single()
      if (error) throw error

      if (tags && tags.length > 0) {
        const { error: tagErr } = await supabase.from('link_tags').insert(tags.map(tagId => ({ link_id: data.id, tag_id: tagId })))
        if (tagErr) throw tagErr
      }

      if (references && references.length > 0) {
        const { error: refErr } = await supabase.from('link_references').insert(
          references.map((r, i) => ({ link_id: data.id, title: r.title || null, url: r.url, sort_order: i }))
        )
        if (refErr) throw refErr
      }

      return data as Link
    },
    onSuccess: (createdLink) => {
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      qc.invalidateQueries({ queryKey: ['categories'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: statsKeys.all })
      toast.success('Đã tạo link thành công')

      // Kick off health check in background — result updates status without blocking UI
      if (!createdLink.is_internal && !createdLink.health_check_exempt) {
        supabase.functions
          .invoke('check-link-health', {
            body: { links: [{ id: createdLink.id, url: createdLink.url }], timeout_ms: HEALTH_CHECK_TIMEOUT_MS },
          })
          .then(() => {
            qc.invalidateQueries({ queryKey: linkKeys.all })
            qc.invalidateQueries({ queryKey: adminLinkKeys.all })
            qc.invalidateQueries({ queryKey: statsKeys.all })
          })
          .catch(() => { /* edge function unavailable — cron will check later */ })
      }
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useUpdateLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<LinkFormValues> }) => {
      const { tags, references, health_status_override, ...linkData } = values
      const { data, error } = await supabase
        .from('links')
        .update({
          ...linkData,
          updated_at: new Date().toISOString(),
          ...(linkData.is_internal === true ? { health_status: 'unknown' } : {}),
          ...(linkData.health_check_exempt === true ? { health_status: health_status_override, last_http_status: null } : {}),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (tags !== undefined) {
        const { error: delTagErr } = await supabase.from('link_tags').delete().eq('link_id', id)
        if (delTagErr) throw delTagErr
        if (tags.length > 0) {
          const { error: insTagErr } = await supabase.from('link_tags').insert(tags.map(tagId => ({ link_id: id, tag_id: tagId })))
          if (insTagErr) throw insTagErr
        }
      }

      if (references !== undefined) {
        const { error: delRefErr } = await supabase.from('link_references').delete().eq('link_id', id)
        if (delRefErr) throw delRefErr
        if (references.length > 0) {
          const { error: insRefErr } = await supabase.from('link_references').insert(
            references.map((r, i) => ({ link_id: id, title: r.title || null, url: r.url, sort_order: i }))
          )
          if (insRefErr) throw insRefErr
        }
      }

      return data as Link
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      qc.invalidateQueries({ queryKey: ['categories'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: statsKeys.all })
      toast.success('Đã cập nhật link')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useDeleteLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, iconUrl }: { id: string; iconUrl?: string | null }) => {
      if (iconUrl) {
        const storagePath = extractStoragePath(iconUrl)
        if (storagePath) {
          await supabase.storage.from('link-icons').remove([storagePath])
        }
      }
      const { error } = await supabase.from('links').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      qc.invalidateQueries({ queryKey: ['categories'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: statsKeys.all })
      toast.success('Đã xóa link')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useResetLinkClicks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('links').update({ click_count: 0 }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
      toast.success('Đã xóa lượt click')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useResetAllClicks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('links').update({ click_count: 0 }).gte('click_count', 0)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
      toast.success('Đã xóa tất cả lượt click')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useIncrementClick() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (linkId: string) => {
      await supabase.rpc('increment_link_click', { link_id: linkId })
    },
    onSuccess: () => {
      // Invalidate để đồng bộ click_count giữa tất cả sections trên trang
      qc.invalidateQueries({ queryKey: linkKeys.all })
    },
  })
}

function extractStoragePath(iconUrl: string): string | null {
  try {
    const urlObj = new URL(iconUrl)
    if (urlObj.pathname.includes('/storage/v1/object/public/link-icons/')) {
      return decodeURIComponent(urlObj.pathname.split('/link-icons/').pop() ?? '') || null
    }
  } catch { /* not a valid URL */ }
  return null
}

export function useUploadLinkIcon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ linkId, file, oldIconUrl }: { linkId: string; file: File; oldIconUrl?: string | null }) => {
      // Delete old storage file to avoid accumulation and bypass upsert policy issues
      if (oldIconUrl) {
        const oldPath = extractStoragePath(oldIconUrl)
        if (oldPath) {
          await supabase.storage.from('link-icons').remove([oldPath])
        }
      }

      const ext = file.name.split('.').pop()
      const path = `${linkId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('link-icons')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('link-icons').getPublicUrl(path)
      const iconUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .from('links')
        .update({ icon_url: iconUrl })
        .eq('id', linkId)
      if (updateError) throw updateError

      return iconUrl
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
    },
    onError: (err: Error) => toast.error(`Lỗi upload icon: ${err.message}`),
  })
}

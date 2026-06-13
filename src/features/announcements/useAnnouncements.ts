import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Announcement } from '@/types'
import { AnnouncementFormValues } from '@/lib/validators'

export const announcementKeys = {
  all: ['announcements'] as const,
  active: () => [...announcementKeys.all, 'active'] as const,
}

export function useAnnouncements(activeOnly = false) {
  return useQuery({
    queryKey: activeOnly ? announcementKeys.active() : announcementKeys.all,
    queryFn: async () => {
      let q = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

      if (activeOnly) {
        const now = new Date().toISOString()
        q = q
          .eq('is_active', true)
          .or(`starts_at.is.null,starts_at.lte.${now}`)
          .or(`ends_at.is.null,ends_at.gte.${now}`)
      }

      const { data, error } = await q
      if (error) throw error
      return data as Announcement[]
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: AnnouncementFormValues) => {
      const { data, error } = await supabase.from('announcements').insert(values).select().single()
      if (error) throw error
      return data as Announcement
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: announcementKeys.all })
      toast.success('Đã tạo thông báo')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<AnnouncementFormValues> }) => {
      const { data, error } = await supabase
        .from('announcements')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Announcement
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: announcementKeys.all })
      toast.success('Đã cập nhật thông báo')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: announcementKeys.all })
      toast.success('Đã xóa thông báo')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

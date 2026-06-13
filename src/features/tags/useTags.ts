import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Tag } from '@/types'
import { linkKeys, adminLinkKeys } from '@/features/links/useLinks'

export const tagKeys = {
  all: ['tags'] as const,
}

export function useTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data as Tag[]
    },
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, slug, color }: { name: string; slug: string; color?: string }) => {
      const { data, error } = await supabase.from('tags').insert({ name, slug, color }).select().single()
      if (error) throw error
      return data as Tag
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all })
      toast.success('Đã tạo tag thành công')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, slug, color }: { id: string; name: string; slug: string; color?: string | null }) => {
      const { data, error } = await supabase
        .from('tags')
        .update({ name, slug, color: color || null })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Tag
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all })
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      toast.success('Đã cập nhật tag')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all })
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      toast.success('Đã xóa tag')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

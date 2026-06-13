import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Category } from '@/types'
import { CategoryFormValues } from '@/lib/validators'
import { linkKeys, adminLinkKeys } from '@/features/links/useLinks'

export const categoryKeys = {
  all: ['categories'] as const,
  active: () => [...categoryKeys.all, 'active'] as const,
}

export function useCategories(activeOnly = false) {
  return useQuery({
    queryKey: activeOnly ? categoryKeys.active() : categoryKeys.all,
    queryFn: async () => {
      let q = supabase
        .from('categories')
        .select('*, links(count)')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (activeOnly) q = q.eq('is_active', true)

      const { data, error } = await q
      if (error) throw error

      return (data as (Category & { links: { count: number }[] })[]).map(cat => ({
        ...cat,
        link_count: cat.links?.[0]?.count ?? 0,
      })) as Category[]
    },
  })
}

async function renumberCategories() {
  const { error } = await supabase.rpc('renumber_categories')
  if (error) throw error
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const { data, error } = await supabase.from('categories').insert(values).select().single()
      if (error) throw error
      await renumberCategories()
      return data as Category
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all })
      toast.success('Đã tạo danh mục thành công')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<CategoryFormValues> }) => {
      const { data, error } = await supabase
        .from('categories')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await renumberCategories()
      return data as Category
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all })
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      toast.success('Đã cập nhật danh mục')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      await renumberCategories()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all })
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      toast.success('Đã xóa danh mục')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}

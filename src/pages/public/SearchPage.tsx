import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLinks } from '@/features/links/useLinks'
import { useCategories } from '@/features/categories/useCategories'
import { usePortalSettings, DEFAULT_SETTINGS } from '@/features/settings/useSettings'
import { LinkGrid } from '@/components/links/LinkGrid'
import { LinkCardGridSkeleton } from '@/components/common/LoadingSkeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LinkFilters } from '@/types'
import { SORT_OPTIONS } from '@/constants'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQ)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ)
  const [categoryId, setCategoryId] = useState('')
  const [sort, setSort] = useState<LinkFilters['sort']>('updated_desc')
  const [displayCount, setDisplayCount] = useState(DEFAULT_SETTINGS.default_page_size)

  const { data: categories } = useCategories(true)
  const { data: settings } = usePortalSettings()
  const pageSize = settings?.default_page_size ?? DEFAULT_SETTINGS.default_page_size

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setSearchParams(query ? { q: query } : {}, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [query, setSearchParams])

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(DEFAULT_SETTINGS.default_page_size)
  }, [debouncedQuery, categoryId, sort])

  const filters: LinkFilters = {
    search: debouncedQuery || undefined,
    category_id: categoryId || undefined,
    sort,
  }

  const effectiveCount = Math.max(displayCount, pageSize)
  const { data, isLoading, isFetching } = useLinks(filters, 1, effectiveCount)
  const canLoadMore = (data?.total ?? 0) > (data?.links?.length ?? 0)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Tìm kiếm</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm kiếm hệ thống, tài liệu, công cụ..."
            className="pl-9"
            autoFocus
          />
        </div>
        <Select value={categoryId || 'all'} onValueChange={v => setCategoryId(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories?.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={v => setSort(v as LinkFilters['sort'])}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LinkCardGridSkeleton count={6} />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {debouncedQuery && (
            <p className="text-sm text-muted-foreground">
              Hiển thị {data?.links?.length ?? 0} / {data?.total ?? 0} kết quả cho "<strong>{debouncedQuery}</strong>"
            </p>
          )}
          <LinkGrid
            links={data?.links || []}
            emptyTitle={debouncedQuery ? `Không tìm thấy kết quả cho "${debouncedQuery}"` : 'Nhập từ khóa để tìm kiếm'}
            emptyDescription="Thử tìm bằng từ khóa khác hoặc chọn danh mục."
          />
          {canLoadMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setDisplayCount(c => c + pageSize)}
                disabled={isFetching}
                className="gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                {isFetching ? 'Đang tải...' : `Tải thêm (còn ${(data?.total ?? 0) - (data?.links?.length ?? 0)})`}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

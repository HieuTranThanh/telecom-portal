import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Search, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCategories } from '@/features/categories/useCategories'
import { useLinks } from '@/features/links/useLinks'
import { usePortalSettings, DEFAULT_SETTINGS } from '@/features/settings/useSettings'
import { LinkGrid } from '@/components/links/LinkGrid'
import { LinkCardGridSkeleton } from '@/components/common/LoadingSkeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SORT_OPTIONS } from '@/constants'
import { LinkFilters } from '@/types'

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: categories, isLoading: categoriesLoading } = useCategories(true)
  const { data: settings } = usePortalSettings()
  const pageSize = settings?.default_page_size ?? DEFAULT_SETTINGS.default_page_size

  const category = categories?.find(c => c.slug === slug)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<LinkFilters['sort']>('updated_desc')
  const [displayCount, setDisplayCount] = useState(DEFAULT_SETTINGS.default_page_size)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(DEFAULT_SETTINGS.default_page_size)
  }, [search, category?.id, sort])

  const filters: LinkFilters = {
    search: search || undefined,
    category_id: category?.id,
    sort,
  }

  // effectiveCount ensures we always show at least one full page per settings,
  // and grows when the user requests more
  const effectiveCount = Math.max(displayCount, pageSize)
  const { data, isLoading: linksLoading, isFetching } = useLinks(filters, 1, effectiveCount, { enabled: !!category?.id })
  const isLoading = categoriesLoading || linksLoading
  const canLoadMore = (data?.total ?? 0) > (data?.links?.length ?? 0)

  if (!category && categories) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Danh mục không tồn tại.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/">Về trang chủ</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category?.icon || '📁'}</span>
          <div>
            <h1 className="text-xl font-bold">{category?.name || 'Đang tải...'}</h1>
            {category?.description && (
              <p className="text-sm text-muted-foreground">{category.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm trong danh mục..."
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={v => setSort(v as LinkFilters['sort'])}>
          <SelectTrigger className="w-full sm:w-48">
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
          <p className="text-sm text-muted-foreground">
            Hiển thị {data?.links?.length ?? 0} / {data?.total ?? 0} kết quả
          </p>
          <LinkGrid
            links={data?.links || []}
            emptyTitle="Chưa có link nào trong danh mục này"
            emptyDescription="Hãy thử chọn danh mục khác hoặc liên hệ quản trị viên."
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

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Activity, Globe, MoreHorizontal, LayoutGrid, Star, Zap, Power, Lock, RotateCcw, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAllLinksAdmin, useDeleteLink, useUpdateLink, useCreateLink, useUploadLinkIcon, useResetLinkClicks, useResetAllClicks, linkKeys, adminLinkKeys } from '@/features/links/useLinks'
import { useCategories } from '@/features/categories/useCategories'
import { useCheckSingleLink } from '@/features/health-check/useHealthCheck'
import { LinkForm } from '@/components/admin/LinkForm'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { HealthStatusBadge, BusinessStatusBadge, InternalBadge } from '@/components/links/LinkStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { LinkFormValues } from '@/lib/validators'
import { Link, LinkFilters } from '@/types'
import { cn, formatNumber, timeAgo } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE } from '@/constants'
import { EmptyState } from '@/components/common/EmptyState'

function LinkIconImg({ iconUrl }: { iconUrl: string | null }) {
  const [err, setErr] = useState(false)
  useEffect(() => { setErr(false) }, [iconUrl])
  return (
    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
      {iconUrl && !err
        ? <img src={iconUrl} alt="" className="h-6 w-6 object-contain" onError={() => setErr(true)} />
        : <Globe className="h-4 w-4 text-muted-foreground" />}
    </div>
  )
}

export function LinksPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [attrFilter, setAttrFilter] = useState('all')
  const [sort, setSort] = useState<NonNullable<LinkFilters['sort']>>('updated_desc')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editLink, setEditLink] = useState<Link | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; iconUrl?: string | null } | null>(null)
  const [resetClicksTarget, setResetClicksTarget] = useState<{ id: string; name: string } | null>(null)
  const [resetAllOpen, setResetAllOpen] = useState(false)

  const qc = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const ATTR_FILTER_MAP: Record<string, Partial<LinkFilters>> = {
    featured:     { is_featured: true },
    frequent:     { is_frequent: true },
    quick_access: { is_quick_access: true },
    internal:     { is_internal: true },
    inactive:     { is_active: false },
    no_attr:      { no_attributes: true },
  }

  const handleSort = (col: 'name' | 'click_count' | 'updated_at') => {
    setSort(prev => {
      if (col === 'name') return prev === 'name_asc' ? 'name_desc' : 'name_asc'
      if (col === 'click_count') return prev === 'click_count_desc' ? 'click_count_asc' : 'click_count_desc'
      return prev === 'updated_desc' ? 'updated_asc' : 'updated_desc'
    })
    setPage(1)
  }

  const sortIcon = (col: 'name' | 'click_count' | 'updated_at') => {
    const map = { name: ['name_asc', 'name_desc'], click_count: ['click_count_asc', 'click_count_desc'], updated_at: ['updated_asc', 'updated_desc'] }
    const [asc, desc] = map[col]
    if (sort === asc) return <ArrowUp className="h-3.5 w-3.5" />
    if (sort === desc) return <ArrowDown className="h-3.5 w-3.5" />
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
  }

  const filters: LinkFilters = {
    search: search || undefined,
    category_id: categoryFilter !== 'all' && categoryFilter !== 'no_category' ? categoryFilter : undefined,
    no_category: categoryFilter === 'no_category' ? true : undefined,
    business_status: statusFilter !== 'all' ? (statusFilter as LinkFilters['business_status']) : undefined,
    ...(attrFilter !== 'all' ? ATTR_FILTER_MAP[attrFilter] : {}),
    sort,
  }

  const { data, isLoading } = useAllLinksAdmin(filters, page)
  const { data: categories } = useCategories(true)
  const { mutate: deleteLink } = useDeleteLink()
  const { mutate: updateLink, isPending: isUpdating } = useUpdateLink()
  const { mutate: createLink, isPending: isCreating } = useCreateLink()
  const { mutate: uploadIcon } = useUploadLinkIcon()
  const { mutate: checkLinkHealth } = useCheckSingleLink()
  const { mutate: resetClicks } = useResetLinkClicks()
  const { mutate: resetAllClicks } = useResetAllClicks()

  const totalPages = Math.ceil((data?.total ?? 0) / DEFAULT_PAGE_SIZE)

  const handleEdit = (link: Link) => {
    setEditLink(link)
    setFormOpen(true)
  }

  const handleAddNew = () => {
    setEditLink(null)
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditLink(null)
  }

  const handleSubmit = (values: LinkFormValues, iconFile?: File) => {
    if (editLink) {
      updateLink({ id: editLink.id, values }, {
        onSuccess: (updatedLink) => {
          handleCloseForm()
          // Trigger health check immediately
          checkLinkHealth(updatedLink)
          // Upload icon file if selected
          if (iconFile) {
            uploadIcon({ linkId: editLink.id, file: iconFile, oldIconUrl: editLink.icon_url }, {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: linkKeys.all })
                qc.invalidateQueries({ queryKey: adminLinkKeys.all })
              },
            })
          }
        },
      })
    } else {
      createLink(values, {
        onSuccess: (newLink) => {
          handleCloseForm()
          // Trigger health check immediately
          checkLinkHealth(newLink)
          // Upload icon file if selected
          if (iconFile) {
            uploadIcon({ linkId: newLink.id, file: iconFile }, {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: linkKeys.all })
                qc.invalidateQueries({ queryKey: adminLinkKeys.all })
              },
            })
          }
        },
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Link</h1>
          <p className="text-muted-foreground text-sm">{data?.total ?? 0} link trong hệ thống</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setResetAllOpen(true)} className="text-muted-foreground hover:text-destructive hover:border-destructive">
            <RotateCcw className="h-4 w-4 mr-2" />
            Xóa tất cả lượt click
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm link
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm link..."
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            <SelectItem value="no_category">Không có danh mục</SelectItem>
            {categories?.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="suspended">Tạm ngưng</SelectItem>
            <SelectItem value="expired">Hết hạn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={attrFilter} onValueChange={v => { setAttrFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Thuộc tính" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả thuộc tính</SelectItem>
            <SelectItem value="no_attr">Không có thuộc tính</SelectItem>
            <SelectItem value="featured">
              <span className="flex items-center gap-2"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />Nổi bật</span>
            </SelectItem>
            <SelectItem value="frequent">
              <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />Thường dùng</span>
            </SelectItem>
            <SelectItem value="quick_access">
              <span className="flex items-center gap-2"><LayoutGrid className="h-3.5 w-3.5 text-primary" />Quick Access</span>
            </SelectItem>
            <SelectItem value="internal">
              <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-blue-500" />Nội bộ</span>
            </SelectItem>
            <SelectItem value="inactive">
              <span className="flex items-center gap-2"><Power className="h-3.5 w-3.5 text-destructive" />Đã tắt</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort('name')}
              >
                <span className="flex items-center gap-1.5">Tên hệ thống {sortIcon('name')}</span>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Danh mục</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="hidden md:table-cell">Thuộc tính</TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort('click_count')}
              >
                <span className="flex items-center gap-1.5">Lượt click {sortIcon('click_count')}</span>
              </TableHead>
              <TableHead
                className="hidden lg:table-cell cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort('updated_at')}
              >
                <span className="flex items-center gap-1.5">Cập nhật {sortIcon('updated_at')}</span>
              </TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={Globe}
                    title="Chưa có link nào"
                    description='Bấm "Thêm link" để tạo link đầu tiên.'
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.links.map(link => (
                <TableRow key={link.id}>
                  <TableCell>
                    <LinkIconImg iconUrl={link.icon_url} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{link.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{link.url}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {link.category ? `${link.category.icon || ''} ${link.category.name}` : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {link.is_internal
                        ? <InternalBadge />
                        : <HealthStatusBadge status={link.health_status} />}
                      <BusinessStatusBadge status={link.business_status} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <span title={link.is_featured ? 'Nổi bật' : 'Không nổi bật'}>
                        <Star className={cn('h-4 w-4', link.is_featured ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25')} />
                      </span>
                      <span title={link.is_frequent ? 'Thường dùng' : 'Không thường dùng'}>
                        <Zap className={cn('h-4 w-4', link.is_frequent ? 'fill-orange-400 text-orange-400' : 'text-muted-foreground/25')} />
                      </span>
                      <span title={link.is_active ? 'Đang kích hoạt' : 'Đã tắt — ẩn khỏi portal'}>
                        <Power className={cn('h-4 w-4', link.is_active ? 'text-green-500' : 'text-destructive')} />
                      </span>
                      <span title={link.is_quick_access ? 'Quick Access' : 'Không Quick Access'}>
                        <LayoutGrid className={cn('h-4 w-4', link.is_quick_access ? 'text-primary' : 'text-muted-foreground/25')} />
                      </span>
                      <span title={link.is_internal ? 'Link nội bộ — không kiểm tra sức khoẻ' : 'Link công khai'}>
                        <Lock className={cn('h-4 w-4', link.is_internal ? 'text-blue-500' : 'text-muted-foreground/25')} />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{formatNumber(link.click_count)}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{timeAgo(link.updated_at)}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(link)}>
                          <Edit className="h-4 w-4 mr-2" />Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <Activity className="h-4 w-4 mr-2" />Mở link
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setResetClicksTarget({ id: link.id, name: link.name })}
                          disabled={link.click_count === 0}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />Xóa lượt click
                          {link.click_count > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">{formatNumber(link.click_count)}</span>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget({ id: link.id, iconUrl: link.icon_url })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {page}/{totalPages} — {data?.total} kết quả
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Trước</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Tiếp</Button>
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLink ? 'Sửa link' : 'Thêm link mới'}</DialogTitle>
          </DialogHeader>
          <LinkForm
            defaultValues={editLink || undefined}
            onSubmit={handleSubmit}
            isLoading={isUpdating || isCreating}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Xóa link này?"
        description="Hành động này không thể hoàn tác. Link, dữ liệu liên quan và icon trên Storage sẽ bị xóa vĩnh viễn."
        confirmText="Xóa"
        onConfirm={() => {
          if (deleteTarget) {
            deleteLink(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />

      <ConfirmDialog
        open={!!resetClicksTarget}
        onOpenChange={open => !open && setResetClicksTarget(null)}
        title="Xóa lượt click?"
        description={`Lượt click của "${resetClicksTarget?.name}" sẽ được đặt về 0. Hành động này không thể hoàn tác.`}
        confirmText="Xóa lượt click"
        onConfirm={() => {
          if (resetClicksTarget) {
            resetClicks(resetClicksTarget.id, { onSuccess: () => setResetClicksTarget(null) })
          }
        }}
      />

      <ConfirmDialog
        open={resetAllOpen}
        onOpenChange={setResetAllOpen}
        title="Xóa tất cả lượt click?"
        description="Lượt click của tất cả link trong hệ thống sẽ được đặt về 0. Hành động này không thể hoàn tác."
        confirmText="Xóa tất cả"
        onConfirm={() => {
          resetAllClicks(undefined, { onSuccess: () => setResetAllOpen(false) })
        }}
      />
    </div>
  )
}

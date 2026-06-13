import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/features/categories/useCategories'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Link } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { IMPORT_TEMPLATE_HEADERS } from '@/constants'

// Column definitions: key (used in import), label (shown in header), width in chars
const COLUMNS = [
  { key: 'name',               label: 'name',               width: 28 },
  { key: 'url',                label: 'url',                width: 45 },
  { key: 'description',        label: 'description',        width: 35 },
  { key: 'detail_description', label: 'detail_description', width: 35 },
  { key: 'category',           label: 'category',           width: 22 },
  { key: 'tags',               label: 'tags',               width: 22 },
  { key: 'is_featured',        label: 'is_featured',        width: 13 },
  { key: 'is_frequent',        label: 'is_frequent',        width: 13 },
  { key: 'is_active',          label: 'is_active',          width: 13 },
  { key: 'is_quick_access',    label: 'is_quick_access',    width: 15 },
  { key: 'is_internal',        label: 'is_internal',        width: 13 },
  { key: 'business_status',    label: 'business_status',    width: 17 },
  { key: 'slug',               label: 'slug',               width: 30 },
  // Read-only info columns — ignored on re-import
  { key: 'health_status',      label: 'health_status',      width: 15 },
  { key: 'click_count',        label: 'click_count',        width: 13 },
  { key: 'updated_at',         label: 'updated_at',         width: 22 },
]

// Number of writable columns — must equal IMPORT_TEMPLATE_HEADERS.length
const WRITABLE_COLS = IMPORT_TEMPLATE_HEADERS.length

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '2563EB' }, patternType: 'solid' as const },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: false },
  border: {
    top:    { style: 'thin', color: { rgb: 'FFFFFF' } },
    bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
    left:   { style: 'thin', color: { rgb: 'FFFFFF' } },
    right:  { style: 'thin', color: { rgb: 'FFFFFF' } },
  },
}

const INFO_HEADER_STYLE = {
  ...HEADER_STYLE,
  fill: { fgColor: { rgb: '64748B' }, patternType: 'solid' as const },
}

export function ExportPage() {
  const { data: categories } = useCategories(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [onlyFeatured, setOnlyFeatured] = useState(false)
  const [onlyFrequent, setOnlyFrequent] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const fetchData = async () => {
    let q = supabase
      .from('links')
      .select('*, category:categories(name), link_tags(tag:tags(name))')
      .order('name', { ascending: true })
      .limit(10000) // prevent silent truncation at PostgREST default max (1000)

    if (categoryFilter !== 'all') q = q.eq('category_id', categoryFilter)
    if (statusFilter !== 'all') q = q.eq('business_status', statusFilter)
    if (onlyFeatured) q = q.eq('is_featured', true)
    if (onlyFrequent) q = q.eq('is_frequent', true)

    const { data, error } = await q
    if (error) throw error
    return data as (Link & { link_tags: { tag: { name: string } }[] })[]
  }

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setIsExporting(true)
    try {
      const [data, XLSXStyle] = await Promise.all([
        fetchData(),
        import('xlsx-js-style').then(m => m.default),
      ])
      const timestamp = new Date().toISOString().slice(0, 10)

      const buildStyledWorkbook = (rows: (Link & { link_tags: { tag: { name: string } }[] })[], sheetName: string) => {
        const headers = COLUMNS.map(c => c.label)
        const dataRows = rows.map(link => [
          link.name,
          link.url,
          link.description ?? '',
          link.detail_description ?? '',
          (link.category as { name?: string } | null)?.name ?? '',
          link.link_tags?.map(lt => lt.tag.name).join(', ') ?? '',
          link.is_featured ? 'true' : 'false',
          link.is_frequent ? 'true' : 'false',
          link.is_active ? 'true' : 'false',
          link.is_quick_access ? 'true' : 'false',
          link.is_internal ? 'true' : 'false',
          link.business_status,
          link.slug,
          link.health_status,
          link.click_count,
          formatDateTime(link.updated_at),
        ])

        const ws = XLSXStyle.utils.aoa_to_sheet([headers, ...dataRows])
        headers.forEach((_, colIdx) => {
          const cellAddr = XLSXStyle.utils.encode_cell({ r: 0, c: colIdx })
          ws[cellAddr].s = colIdx < WRITABLE_COLS ? HEADER_STYLE : INFO_HEADER_STYLE
        })
        ws['!cols'] = COLUMNS.map(c => ({ wch: c.width }))
        ws['!freeze'] = { xSplit: 0, ySplit: 1 }

        const wb = XLSXStyle.utils.book_new()
        XLSXStyle.utils.book_append_sheet(wb, ws, sheetName)
        return wb
      }

      if (format === 'xlsx') {
        XLSXStyle.writeFile(buildStyledWorkbook(data, 'Links'), `links_export_${timestamp}.xlsx`)
      } else {
        XLSXStyle.writeFile(buildStyledWorkbook(data, 'Links'), `links_export_${timestamp}.csv`, { bookType: 'csv' })
      }

      toast.success(`Đã xuất ${data.length} link`)
    } catch (err) {
      toast.error(`Lỗi export: ${(err as Error).message}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Export dữ liệu</h1>
        <p className="text-muted-foreground text-sm">
          Xuất dữ liệu link ra Excel — cùng format với file import để có thể chỉnh sửa và import lại
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-6 max-w-lg">
        <div>
          <h3 className="font-semibold mb-1">Bộ lọc dữ liệu</h3>
          <p className="text-xs text-muted-foreground">
            13 cột đầu (nền xanh) có thể chỉnh sửa và import lại. 3 cột cuối (nền xám) chỉ để xem.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trạng thái nghiệp vụ</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="suspended">Tạm ngưng</SelectItem>
                <SelectItem value="expired">Hết hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={onlyFeatured} onCheckedChange={setOnlyFeatured} />
              <span className="text-sm">Chỉ link nổi bật</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={onlyFrequent} onCheckedChange={setOnlyFrequent} />
              <span className="text-sm">Chỉ thường dùng</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={() => handleExport('xlsx')} disabled={isExporting} className="flex-1">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Xuất Excel (.xlsx)
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={isExporting} className="flex-1">
            <FileText className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
import { Upload, Download, AlertCircle, CheckCircle2, XCircle, FileSpreadsheet, Info } from 'lucide-react'
import { useCategories } from '@/features/categories/useCategories'
import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { ImportRow, ImportResult } from '@/types'
import { useQueryClient } from '@tanstack/react-query'
import { IMPORT_TEMPLATE_HEADERS } from '@/constants'
import { linkKeys, adminLinkKeys } from '@/features/links/useLinks'
import { statsKeys } from '@/features/statistics/useStatistics'

interface CreatedItem { type: 'category' | 'tag'; name: string }

export function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [errors, setErrors] = useState<ImportResult['errors']>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [createdItems, setCreatedItems] = useState<CreatedItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const { data: categories } = useCategories(true)
  const qc = useQueryClient()

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const { read, utils } = await import('xlsx')
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = utils.sheet_to_json<ImportRow>(ws, { defval: '' })
        setRows(raw)
        setErrors([])
        setResult(null)
        setCreatedItems([])

        const errs: ImportResult['errors'] = []
        raw.forEach((row, i) => {
          if (!row.name) errs.push({ row: i + 2, message: 'Tên không được để trống', data: row })
          if (!row.url) errs.push({ row: i + 2, message: 'URL không được để trống', data: row })
          else {
            try { new URL(row.url) } catch {
              errs.push({ row: i + 2, message: 'URL không hợp lệ', data: row })
            }
          }
        })
        setErrors(errs)
      } catch {
        toast.error('Không thể đọc file. Vui lòng dùng file XLSX hoặc CSV.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(xlsx|csv)$/i)) {
      toast.error('Chỉ hỗ trợ file .xlsx và .csv')
      e.target.value = ''
      return
    }
    processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(xlsx|csv)$/i)) {
      toast.error('Chỉ hỗ trợ file .xlsx và .csv')
      return
    }
    processFile(file)
  }

  const handleImport = async () => {
    // Keep the original spreadsheet row number with each valid row so import
    // failures are reported against the real row, not the filtered index.
    const validRows = rows
      .map((row, i) => ({ row, sheetRow: i + 2 }))
      .filter(({ sheetRow }) => !errors.find(e => e.row === sheetRow))
    if (!validRows.length) { toast.error('Không có dòng hợp lệ để import'); return }

    setImporting(true)
    setProgress(0)
    let inserted = 0
    let updated = 0
    const failedRows: ImportResult['errors'] = []
    const newItems: CreatedItem[] = []

    // Build a mutable category map from current data
    const categoryMap = new Map<string, string>()
    categories?.forEach(c => {
      categoryMap.set(c.name.toLowerCase(), c.id)
      categoryMap.set(c.slug.toLowerCase(), c.id)
    })

    // Build a mutable tag map (fetch all tags)
    const tagMap = new Map<string, string>()
    try {
      const { data: allTags } = await supabase.from('tags').select('id, name, slug')
      allTags?.forEach(t => {
        tagMap.set(t.name.toLowerCase(), t.id)
        tagMap.set(t.slug.toLowerCase(), t.id)
      })
    } catch { /* proceed without tags */ }

    // Build URL → existing link ID map for upsert logic
    const urlToId = new Map<string, string>()
    try {
      const { data: existingLinks } = await supabase.from('links').select('id, url')
      existingLinks?.forEach(l => urlToId.set(l.url.trim(), l.id))
    } catch { /* proceed — all rows treated as new inserts */ }

    for (let i = 0; i < validRows.length; i++) {
      const { row, sheetRow } = validRows[i]
      try {
        // Resolve category — create if not found
        let categoryId: string | null = null
        if (row.category) {
          const catKey = row.category.trim().toLowerCase()
          if (categoryMap.has(catKey)) {
            categoryId = categoryMap.get(catKey)!
          } else {
            // Create the new category
            const newSlug = slugify(row.category.trim())
            const { data: newCat, error: catErr } = await supabase
              .from('categories')
              .insert({ name: row.category.trim(), slug: newSlug, sort_order: 999, is_active: true })
              .select()
              .single()
            if (!catErr && newCat) {
              categoryId = newCat.id
              categoryMap.set(newCat.name.toLowerCase(), newCat.id)
              categoryMap.set(newCat.slug.toLowerCase(), newCat.id)
              newItems.push({ type: 'category', name: newCat.name })
            }
          }
        }

        // Resolve tags — create if not found
        const tagIds: string[] = []
        if (row.tags) {
          const tagNames = String(row.tags).split(',').map(t => t.trim()).filter(Boolean)
          for (const tagName of tagNames) {
            const tagKey = tagName.toLowerCase()
            if (tagMap.has(tagKey)) {
              tagIds.push(tagMap.get(tagKey)!)
            } else {
              const newTagSlug = slugify(tagName)
              const { data: newTag, error: tagErr } = await supabase
                .from('tags')
                .insert({ name: tagName, slug: newTagSlug })
                .select()
                .single()
              if (!tagErr && newTag) {
                tagIds.push(newTag.id)
                tagMap.set(newTag.name.toLowerCase(), newTag.id)
                tagMap.set(newTag.slug.toLowerCase(), newTag.id)
                newItems.push({ type: 'tag', name: newTag.name })
              }
            }
          }
        }

        const isFeatured = row.is_featured === true || row.is_featured === 'true' || row.is_featured === '1'
        const isFrequent = row.is_frequent === true || row.is_frequent === 'true' || row.is_frequent === '1'
        const isActive = (row.is_active === '' || row.is_active === undefined)
          ? true
          : (row.is_active === true || row.is_active === 'true' || row.is_active === '1')
        const isQuickAccess = row.is_quick_access === true || row.is_quick_access === 'true' || row.is_quick_access === '1'
        const isInternal = row.is_internal === true || row.is_internal === 'true' || row.is_internal === '1'
        const businessStatus = (['active', 'suspended', 'expired'] as string[]).includes(row.business_status as string)
          ? row.business_status as string : 'active'
        const slugValue = row.slug?.trim() || `${slugify(row.name)}-${Date.now()}-${i}`

        const existingId = urlToId.get(row.url.trim())
        if (existingId) {
          // URL đã tồn tại → UPDATE (icon, click_count, health_status, quick_access_order không thay đổi)
          const { error: updateErr } = await supabase.from('links').update({
            name: row.name,
            description: row.description || null,
            detail_description: row.detail_description || null,
            category_id: categoryId,
            is_featured: isFeatured,
            is_frequent: isFrequent,
            is_active: isActive,
            is_quick_access: isQuickAccess,
            is_internal: isInternal,
            business_status: businessStatus,
            slug: slugValue,
          }).eq('id', existingId)
          if (updateErr) throw updateErr

          // Thay toàn bộ tags (xóa cũ, gán mới)
          const { error: delTagErr } = await supabase.from('link_tags').delete().eq('link_id', existingId)
          if (delTagErr) throw delTagErr
          if (tagIds.length > 0) {
            const { error: insTagErr } = await supabase.from('link_tags').insert(tagIds.map(tid => ({ link_id: existingId, tag_id: tid })))
            if (insTagErr) throw insTagErr
          }
          updated++
        } else {
          // URL chưa có → INSERT mới
          const { data: newLink, error: insertErr } = await supabase.from('links').insert({
            name: row.name,
            url: row.url,
            description: row.description || null,
            detail_description: row.detail_description || null,
            slug: slugValue,
            category_id: categoryId,
            is_featured: isFeatured,
            is_frequent: isFrequent,
            is_active: isActive,
            is_quick_access: isQuickAccess,
            is_internal: isInternal,
            business_status: businessStatus,
          }).select().single()
          if (insertErr) throw insertErr

          if (tagIds.length > 0 && newLink) {
            const { error: insTagErr } = await supabase.from('link_tags').insert(tagIds.map(tid => ({ link_id: newLink.id, tag_id: tid })))
            if (insTagErr) throw insTagErr
          }
          inserted++
        }
      } catch (err) {
        failedRows.push({ row: sheetRow, message: (err as Error).message, data: row })
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100))
    }

    qc.invalidateQueries({ queryKey: linkKeys.all })
    qc.invalidateQueries({ queryKey: adminLinkKeys.all })
    qc.invalidateQueries({ queryKey: ['categories'] })
    qc.invalidateQueries({ queryKey: ['tags'] })
    qc.invalidateQueries({ queryKey: statsKeys.all })

    setImporting(false)
    setResult({ success: inserted + updated, inserted, updated, failed: failedRows.length, errors: failedRows })
    setCreatedItems(newItems)

    if (newItems.length > 0) {
      const catCount = newItems.filter(x => x.type === 'category').length
      const tagCount = newItems.filter(x => x.type === 'tag').length
      const parts = []
      if (catCount > 0) parts.push(`${catCount} danh mục mới`)
      if (tagCount > 0) parts.push(`${tagCount} tag mới`)
      toast.info(`Đã tự động tạo: ${parts.join(', ')}`)
    }
    const parts = []
    if (inserted > 0) parts.push(`${inserted} link mới`)
    if (updated > 0) parts.push(`${updated} link cập nhật`)
    toast.success(`Import hoàn thành: ${parts.join(', ')}${failedRows.length > 0 ? `, ${failedRows.length} lỗi` : ''}`)
  }

  const downloadTemplate = async () => {
    const XLSXStyle = (await import('xlsx-js-style')).default
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

    const ws = XLSXStyle.utils.aoa_to_sheet([
      IMPORT_TEMPLATE_HEADERS,
      ['KPI Dashboard', 'https://kpi.example.com', 'Tra cứu KPI mạng', '', 'KPI & Báo cáo', 'KPI,BTS', 'true', 'false', 'true', 'false', 'false', 'active', 'kpi-dashboard'],
      ['Hệ thống CRM', 'https://crm.example.com', 'Quản lý khách hàng', '', 'Vận hành kỹ thuật', 'CRM', 'false', 'true', 'true', 'true', 'false', 'active', 'he-thong-crm'],
    ])

    IMPORT_TEMPLATE_HEADERS.forEach((_, colIdx) => {
      const cellAddr = XLSXStyle.utils.encode_cell({ r: 0, c: colIdx })
      ws[cellAddr].s = HEADER_STYLE
    })

    ws['!cols'] = [
      { wch: 28 }, { wch: 45 }, { wch: 35 }, { wch: 35 }, { wch: 22 },
      { wch: 22 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 15 },
      { wch: 13 }, { wch: 17 }, { wch: 30 },
    ]
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

    const wb = XLSXStyle.utils.book_new()
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Import Template')
    XLSXStyle.writeFile(wb, 'import_template.xlsx')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import dữ liệu</h1>
        <p className="text-muted-foreground text-sm">Import link từ file Excel (.xlsx) hoặc CSV — dùng file mẫu để đúng định dạng</p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Tải file lên</h3>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Tải file mẫu
          </Button>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/50'
          }`}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
        >
          <FileSpreadsheet className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="font-medium">Kéo thả hoặc bấm để chọn file</p>
          <p className="text-sm text-muted-foreground">Hỗ trợ .xlsx và .csv</p>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleFile} className="hidden" />
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2 text-sm text-blue-800">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Lưu ý khi import:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Nếu <strong>danh mục</strong> chưa có trong hệ thống, sẽ được tạo tự động</li>
              <li>Nếu <strong>tags</strong> chưa có, sẽ được tạo tự động (phân cách bằng dấu phẩy)</li>
              <li><strong>URL là key</strong>: nếu URL đã tồn tại → cập nhật link đó; nếu chưa có → tạo mới (không tạo trùng lặp)</li>
              <li>Các trường không bị ghi đè khi cập nhật: icon, click_count, health_status, quick_access_order</li>
            </ul>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Các cột cần có:</p>
          <div className="flex flex-wrap gap-1">
            {IMPORT_TEMPLATE_HEADERS.map(h => (
              <code key={h} className="bg-muted px-1.5 py-0.5 rounded">{h}</code>
            ))}
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{rows.length} dòng</span>
              {errors.length > 0 && (
                <span className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.length} lỗi
                </span>
              )}
            </div>
            <Button onClick={handleImport} disabled={importing || rows.length === 0}>
              {importing ? 'Đang import...' : `Import ${rows.length - errors.length} dòng hợp lệ`}
            </Button>
          </div>

          {importing && <Progress value={progress} />}

          {result && (
            <div className={`rounded-lg border p-4 flex items-start gap-3 ${result.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">{result.success} dòng thành công</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {result.inserted > 0 && <span>✚ {result.inserted} link mới</span>}
                  {result.updated > 0 && <span>↑ {result.updated} link cập nhật</span>}
                </div>
                {result.failed > 0 && <p className="text-sm text-amber-700">{result.failed} dòng thất bại</p>}
                {createdItems.length > 0 && (
                  <div className="text-xs text-blue-700 mt-1">
                    <p className="font-medium">Đã tự động tạo mới:</p>
                    {createdItems.filter(x => x.type === 'category').length > 0 && (
                      <p>📁 Danh mục: {createdItems.filter(x => x.type === 'category').map(x => x.name).join(', ')}</p>
                    )}
                    {createdItems.filter(x => x.type === 'tag').length > 0 && (
                      <p>🏷️ Tags: {createdItems.filter(x => x.type === 'tag').map(x => x.name).join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="w-24">Tình trạng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 20).map((row, i) => {
                  const rowError = errors.find(e => e.row === i + 2)
                  return (
                    <TableRow key={i} className={rowError ? 'bg-red-50/50' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{i + 2}</TableCell>
                      <TableCell className="text-sm">{row.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{row.url}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.category || '—'}</TableCell>
                      <TableCell>
                        {rowError ? (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="h-3.5 w-3.5" />
                            {rowError.message}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Hợp lệ
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {rows.length > 20 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Hiển thị 20/{rows.length} dòng
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

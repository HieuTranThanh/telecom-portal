import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, ArrowUp, ArrowDown, LayoutGrid, Globe } from 'lucide-react'
import { useQuickAccessLinks, useReorderQuickAccess } from '@/features/links/useLinks'
import { usePortalSettings, DEFAULT_SETTINGS } from '@/features/settings/useSettings'
import { Button } from '@/components/ui/button'
import { Link } from '@/types'
import { cn } from '@/lib/utils'

function LinkItemIcon({ iconUrl }: { iconUrl: string | null }) {
  const [err, setErr] = useState(false)
  useEffect(() => { setErr(false) }, [iconUrl])
  if (iconUrl && !err) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="h-8 w-8 object-contain rounded shrink-0"
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
      <Globe className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}

export function QuickAccessPage() {
  const { data: settings } = usePortalSettings()
  const qaLimit = settings?.quick_access_limit ?? DEFAULT_SETTINGS.quick_access_limit
  const { data: links, isLoading } = useQuickAccessLinks(qaLimit)
  const reorder = useReorderQuickAccess()
  const navigate = useNavigate()

  const [localLinks, setLocalLinks] = useState<Link[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  useEffect(() => {
    if (links) setLocalLinks(links)
  }, [links])

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= localLinks.length) return
    const next = [...localLinks]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setLocalLinks(next)
    reorder.mutate(next.map(l => l.id))
  }

  const handleDragStart = (idx: number) => setDragIdx(idx)

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx !== null && idx !== dragIdx) setOverIdx(idx)
  }

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      setOverIdx(null)
      return
    }
    const next = [...localLinks]
    const [removed] = next.splice(dragIdx, 1)
    next.splice(idx, 0, removed)
    setLocalLinks(next)
    reorder.mutate(next.map(l => l.id))
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setOverIdx(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sắp xếp Quick Access</h1>
        <p className="text-sm text-muted-foreground">
          Kéo thả để sắp xếp thứ tự các link trong khu vực Truy cập nhanh trên trang chủ.
          Thay đổi được lưu ngay lập tức.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2 max-w-2xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      ) : localLinks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center max-w-2xl">
          <LayoutGrid className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Chưa có link nào trong Quick Access</p>
          <p className="text-xs text-muted-foreground mt-1">
            Vào Quản lý Link, chỉnh sửa link và bật toggle Quick Access để thêm.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/admin/links')}>
            Đến Quản lý Link
          </Button>
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {localLinks.map((link, idx) => (
            <div
              key={link.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                'flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-all select-none',
                reorder.isPending && 'opacity-70',
                dragIdx === idx && 'opacity-40 scale-[0.98]',
                overIdx === idx && dragIdx !== idx && 'border-primary bg-primary/5 shadow-sm'
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />

              <span className="text-sm text-muted-foreground w-5 text-right shrink-0 tabular-nums">
                {idx + 1}.
              </span>

              <LinkItemIcon iconUrl={link.icon_url} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{link.name}</p>
                {link.description && (
                  <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || reorder.isPending}
                  title="Lên trên"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => move(idx, 1)}
                  disabled={idx === localLinks.length - 1 || reorder.isPending}
                  title="Xuống dưới"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground pt-1 pl-1">
            {localLinks.length}/{qaLimit} link · Kéo thả hoặc dùng ↑↓ để sắp xếp · Giới hạn cấu hình tại{' '}
            <button onClick={() => navigate('/admin/settings')} className="underline hover:text-foreground">
              Cài đặt
            </button>
          </p>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ExternalLink, Copy, Star, ArrowLeft, Globe, Clock, Activity, Check, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { useLink, useIncrementClick } from '@/features/links/useLinks'
import { useFavorites } from '@/hooks/useFavorites'
import { useRecentLinks } from '@/hooks/useRecentLinks'
import { HealthStatusBadge, BusinessStatusBadge, InternalBadge } from '@/components/links/LinkStatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDateTime, formatNumber, getContrastTextColor } from '@/lib/utils'

export function LinkDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: link, isLoading } = useLink(slug!)
  const { mutate: incrementClick } = useIncrementClick()
  const { toggleFavorite, isFavorite } = useFavorites()
  const { addRecent } = useRecentLinks()
  const [copied, setCopied] = useState(false)
  const [iconErr, setIconErr] = useState(false)
  const [copiedField, setCopiedField] = useState<'user' | 'pass' | null>(null)

  useEffect(() => { setIconErr(false) }, [link?.icon_url])

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!link) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Không tìm thấy link này.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/">Về trang chủ</Link>
        </Button>
      </div>
    )
  }

  const handleOpen = () => {
    window.open(link.url, '_blank', 'noopener,noreferrer')
    incrementClick(link.id)
    addRecent(link.id)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
      toast.success('Đã sao chép liên kết')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không thể sao chép — vui lòng sao chép thủ công')
    }
  }

  const favorite = isFavorite(link.id)
  const hasCredentials = !!(link.login_username || link.login_password)

  const handleCopyCredential = async (text: string, field: 'user' | 'pass') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success(field === 'user' ? 'Đã sao chép tên đăng nhập' : 'Đã sao chép mật khẩu')
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error('Không thể sao chép')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl space-y-6"
    >
      <Button variant="ghost" size="sm" asChild>
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Quay lại</Link>
      </Button>

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {link.icon_url && !iconErr ? (
              <img src={link.icon_url} alt={link.name} className="h-9 w-9 object-contain" onError={() => setIconErr(true)} />
            ) : (
              <Globe className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{link.name}</h1>
            {link.category && (
              <Link
                to={`/category/${link.category.slug}`}
                className="text-sm text-primary hover:underline mt-0.5 block"
              >
                {link.category.icon} {link.category.name}
              </Link>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              {link.is_internal ? <InternalBadge /> : <HealthStatusBadge status={link.health_status} />}
              <BusinessStatusBadge status={link.business_status} />
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="rounded-lg border bg-white p-1.5 shadow-sm">
              <QRCodeSVG value={link.url} size={88} level="M" />
            </div>
            <span className="text-[10px] text-muted-foreground">Quét để mở</span>
          </div>
        </div>

        {link.description && (
          <p className="text-muted-foreground">{link.description}</p>
        )}

        {link.detail_description && (
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-sm whitespace-pre-wrap">{link.detail_description}</p>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 border px-3 py-2 font-mono text-sm break-all text-muted-foreground">
          {link.url}
        </div>

        {hasCredentials && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Thông tin đăng nhập</p>
            </div>
            {link.login_username && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 w-24">Tên đăng nhập</span>
                <span className="text-sm font-mono flex-1 break-all">{link.login_username}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  onClick={() => handleCopyCredential(link.login_username!, 'user')}
                  aria-label="Sao chép tên đăng nhập"
                >
                  {copiedField === 'user' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
            {link.login_password && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 w-24">Mật khẩu</span>
                <span className="text-sm font-mono flex-1 break-all">{link.login_password}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  onClick={() => handleCopyCredential(link.login_password!, 'pass')}
                  aria-label="Sao chép mật khẩu"
                >
                  {copiedField === 'pass' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        )}

        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {link.tags.map(tag => (
              <span
                key={tag.id}
                className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', !tag.color && 'bg-slate-100 text-slate-600')}
                style={tag.color ? { backgroundColor: tag.color, color: getContrastTextColor(tag.color) } : undefined}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {link.references && link.references.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Tài liệu tham khảo</p>
            <div className="space-y-1">
              {[...link.references].sort((a, b) => a.sort_order - b.sort_order).map(ref => (
                <a
                  key={ref.id}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline py-0.5"
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{ref.title || ref.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button onClick={handleOpen} className="flex-1 h-9" disabled={link.business_status !== 'active'}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Mở hệ thống
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleCopy} aria-label="Sao chép URL">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9 shrink-0', favorite && 'text-amber-500')}
            onClick={() => toggleFavorite(link.id)}
            aria-label={favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
          >
            <Star className={cn('h-4 w-4', favorite && 'fill-current')} />
          </Button>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" />{formatNumber(link.click_count)} lượt truy cập</span>
          {link.last_checked_at && (
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Kiểm tra: {formatDateTime(link.last_checked_at)}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

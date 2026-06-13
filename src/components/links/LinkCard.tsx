import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ExternalLink, Copy, Star, Globe, Check, KeyRound, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Link } from '@/types'
import { useIncrementClick } from '@/features/links/useLinks'
import { useFavorites } from '@/hooks/useFavorites'
import { useRecentLinks } from '@/hooks/useRecentLinks'
import { HealthStatusBadge, BusinessStatusBadge, InternalBadge } from './LinkStatusBadge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn, formatNumber, getContrastTextColor } from '@/lib/utils'

interface LinkCardProps {
  link: Link
  compact?: boolean
  onRemove?: (id: string) => void
}

export function LinkCard({ link, compact = false, onRemove }: LinkCardProps) {
  const { mutate: incrementClick } = useIncrementClick()
  const { toggleFavorite, isFavorite } = useFavorites()
  const { addRecent } = useRecentLinks()
  const [copied, setCopied] = useState(false)
  const [iconErr, setIconErr] = useState(false)
  const [copiedField, setCopiedField] = useState<'user' | 'pass' | null>(null)
  const favorite = isFavorite(link.id)
  const hasCredentials = !!(link.login_username || link.login_password)

  useEffect(() => { setIconErr(false) }, [link.icon_url])

  const handleOpen = () => {
    window.open(link.url, '_blank', 'noopener,noreferrer')
    incrementClick(link.id)
    addRecent(link.id)
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
      toast.success('Đã sao chép liên kết')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không thể sao chép — vui lòng sao chép thủ công')
    }
  }

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

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(link.id)
  }

  const isSuspended = link.business_status !== 'active'

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group relative rounded-xl border bg-card p-4 sm:p-5 flex flex-col gap-3 transition-shadow',
        isSuspended && 'opacity-75'
      )}
    >
      {onRemove && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(link.id) }}
          aria-label="Xóa khỏi lịch sử"
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
          {link.icon_url && !iconErr ? (
            <img src={link.icon_url} alt={link.name} className="h-8 w-8 object-contain" onError={() => setIconErr(true)} />
          ) : (
            <Globe className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <RouterLink
            to={`/links/${link.slug}`}
            className="font-semibold text-sm text-foreground truncate leading-tight hover:text-primary hover:underline block"
          >
            {link.name}
          </RouterLink>
          {link.category && (
            <p className="text-xs text-muted-foreground mt-0.5">{link.category.name}</p>
          )}
        </div>
        {link.is_internal ? <InternalBadge /> : <HealthStatusBadge status={link.health_status} />}
      </div>

      {link.description && (
        <p className={cn('text-sm text-muted-foreground leading-relaxed', compact ? 'line-clamp-1' : 'line-clamp-2')}>
          {link.description}
        </p>
      )}

      {link.tags && link.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {link.tags.slice(0, 4).map(tag => (
            <span
              key={tag.id}
              className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs', !tag.color && 'bg-slate-100 text-slate-600')}
              style={tag.color ? { backgroundColor: tag.color, color: getContrastTextColor(tag.color) } : undefined}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
        <span>{formatNumber(link.click_count)} lượt truy cập</span>
        {isSuspended && <BusinessStatusBadge status={link.business_status} />}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1 h-9 text-xs"
          onClick={handleOpen}
          disabled={isSuspended}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          Mở hệ thống
        </Button>

        {hasCredentials && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 flex-shrink-0 border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                aria-label="Thông tin đăng nhập"
                onClick={e => e.stopPropagation()}
              >
                <KeyRound className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3 space-y-2" align="end" onClick={e => e.stopPropagation()}>
              <p className="text-xs font-semibold text-muted-foreground">Thông tin đăng nhập</p>
              {link.login_username && (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
                  <span className="text-xs text-muted-foreground w-7 shrink-0">User</span>
                  <span className="text-xs font-mono flex-1 truncate">{link.login_username}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleCopyCredential(link.login_username!, 'user')}
                    aria-label="Sao chép tên đăng nhập"
                  >
                    {copiedField === 'user' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
              {link.login_password && (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
                  <span className="text-xs text-muted-foreground w-7 shrink-0">Pass</span>
                  <span className="text-xs font-mono flex-1 truncate">{link.login_password}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleCopyCredential(link.login_password!, 'pass')}
                    aria-label="Sao chép mật khẩu"
                  >
                    {copiedField === 'pass' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 flex-shrink-0"
          onClick={handleCopy}
          aria-label="Copy link"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={cn('h-9 w-9 flex-shrink-0', favorite && 'text-amber-500')}
          onClick={handleToggleFavorite}
          aria-label={favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
        >
          <Star className={cn('h-4 w-4', favorite && 'fill-current')} />
        </Button>
      </div>
    </motion.div>
  )
}

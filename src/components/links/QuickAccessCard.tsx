import { useState, useEffect } from 'react'
import { Pin, Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Link } from '@/types'
import { useIncrementClick } from '@/features/links/useLinks'
import { useQuickAccessPins } from '@/hooks/useQuickAccessPins'
import { useRecentLinks } from '@/hooks/useRecentLinks'
import { cn } from '@/lib/utils'

interface QuickAccessCardProps {
  link: Link
  showPin?: boolean
}

export function QuickAccessCard({ link, showPin = true }: QuickAccessCardProps) {
  const { mutate: incrementClick } = useIncrementClick()
  const { togglePin, isPinned } = useQuickAccessPins()
  const { addRecent } = useRecentLinks()
  const pinned = isPinned(link.id)
  const isSuspended = link.business_status !== 'active'
  const [iconErr, setIconErr] = useState(false)

  useEffect(() => { setIconErr(false) }, [link.icon_url])

  const handleOpen = () => {
    if (isSuspended) return
    window.open(link.url, '_blank', 'noopener,noreferrer')
    incrementClick(link.id)
    addRecent(link.id)
  }

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    togglePin(link.id)
    toast.success(pinned ? 'Đã bỏ ghim khỏi Truy cập nhanh' : 'Đã ghim vào Truy cập nhanh của tôi')
  }

  return (
    <motion.div
      whileHover={!isSuspended ? { y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.12)' } : {}}
      transition={{ duration: 0.18 }}
      onClick={handleOpen}
      className={cn(
        'group relative flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 sm:p-4 transition-colors select-none',
        !isSuspended && 'cursor-pointer hover:border-primary/40 hover:bg-primary/5',
        isSuspended && 'opacity-60 cursor-not-allowed'
      )}
    >
      {showPin && (
        <button
          onClick={handleTogglePin}
          title={pinned ? 'Bỏ ghim' : 'Ghim nhanh'}
          className={cn(
            'absolute top-1.5 right-1.5 p-1.5 rounded-full transition-all duration-150',
            'opacity-60 md:opacity-0 md:group-hover:opacity-100',
            pinned && 'opacity-100 text-primary',
            !pinned && 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Pin className={cn('h-3.5 w-3.5', pinned && 'fill-current')} />
        </button>
      )}

      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
        {link.icon_url && !iconErr ? (
          <img
            src={link.icon_url}
            alt={link.name}
            className="h-11 w-11 object-contain"
            onError={() => setIconErr(true)}
          />
        ) : (
          <Globe className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <div className="text-center w-full px-1">
        <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{link.name}</p>
        {link.category && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{link.category.name}</p>
        )}
      </div>
    </motion.div>
  )
}

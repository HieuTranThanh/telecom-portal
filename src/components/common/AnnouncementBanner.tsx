import { useState } from 'react'
import { X, AlertCircle, Info, Wrench, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnnouncements } from '@/features/announcements/useAnnouncements'
import { Announcement } from '@/types'
import { cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/constants'

function getStoredDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISMISSED_ANNOUNCEMENTS)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

const typeConfig: Record<string, { icon: typeof Info; bg: string; text: string; border: string }> = {
  info: { icon: Info, bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  maintenance: { icon: Wrench, bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  warning: { icon: AlertCircle, bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  critical: { icon: Zap, bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
}

function BannerItem({ announcement, onDismiss }: { announcement: Announcement; onDismiss: () => void }) {
  const config = typeConfig[announcement.type] || typeConfig.info
  const Icon = config.icon

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('border rounded-lg px-4 py-3 flex items-start gap-3', config.bg, config.border)}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', config.text)}>{announcement.title}</p>
        {announcement.content && (
          <p className={cn('text-sm mt-0.5 opacity-80', config.text)}>{announcement.content}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className={cn('flex-shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity', config.text)}
        aria-label="Đóng thông báo"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

export function AnnouncementBanner() {
  const { data: announcements } = useAnnouncements(true)
  const [dismissed, setDismissed] = useState<Set<string>>(getStoredDismissed)

  if (!announcements?.length) return null

  const visible = announcements.filter(a => !dismissed.has(a.id))
  if (!visible.length) return null

  function dismiss(id: string) {
    setDismissed(prev => {
      const next = new Set([...prev, id])
      try { localStorage.setItem(STORAGE_KEYS.DISMISSED_ANNOUNCEMENTS, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  return (
    <div className="space-y-2 mb-6">
      <AnimatePresence>
        {visible.map(a => (
          <BannerItem
            key={a.id}
            announcement={a}
            onDismiss={() => dismiss(a.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

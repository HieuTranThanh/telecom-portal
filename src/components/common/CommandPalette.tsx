import { useState, useEffect, useCallback } from 'react'
import { Search, ExternalLink, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { sanitizeSearch, cn } from '@/lib/utils'
import { Link } from '@/types'
import { useIncrementClick, getTagMatchingLinkIds } from '@/features/links/useLinks'
import { useRecentLinks } from '@/hooks/useRecentLinks'
import { HealthStatusBadge } from '@/components/links/LinkStatusBadge'

function ResultIcon({ iconUrl }: { iconUrl: string | null }) {
  const [err, setErr] = useState(false)
  useEffect(() => { setErr(false) }, [iconUrl])
  return (
    <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
      {iconUrl && !err
        ? <img src={iconUrl} alt="" className="h-6 w-6 object-contain" onError={() => setErr(true)} />
        : <span className="text-lg">🔗</span>}
    </div>
  )
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Link[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const { mutate: incrementClick } = useIncrementClick()
  const { addRecent } = useRecentLinks()

  const search = useCallback(async (q: string) => {
    const sanitized = sanitizeSearch(q.trim())
    if (!sanitized) { setResults([]); return }
    setIsLoading(true)
    try {
      const tagMatchingLinkIds = await getTagMatchingLinkIds(sanitized)
      const baseFilter = `name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,url.ilike.%${sanitized}%`
      const orFilter = tagMatchingLinkIds.length > 0
        ? `${baseFilter},id.in.(${tagMatchingLinkIds.join(',')})`
        : baseFilter

      const { data } = await supabase
        .from('links')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .or(orFilter)
        .limit(8)
      setResults((data ?? []) as Link[])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    setSelected(0)
  }, [results])

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]) }
  }, [open])

  const openLink = useCallback((link: Link) => {
    window.open(link.url, '_blank', 'noopener,noreferrer')
    incrementClick(link.id)
    addRecent(link.id)
    onClose()
  }, [incrementClick, addRecent, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) { openLink(results[selected]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, selected, onClose, openLink])

  return (
    <AnimatePresence>
      {open && (
      <div key="cmd" className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative z-10 w-full max-w-2xl mx-4 rounded-xl border bg-background shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm nhanh hệ thống..."
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
              Esc
            </kbd>
          </div>

          {results.length > 0 ? (
            <ul className="max-h-[60vh] overflow-y-auto py-2">
              {results.map((link, i) => (
                <li key={link.id}>
                  <button
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
                      i === selected && 'bg-accent'
                    )}
                    onClick={() => openLink(link)}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <ResultIcon iconUrl={link.icon_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{link.name}</span>
                        <HealthStatusBadge status={link.health_status} className="text-xs py-0" />
                      </div>
                      {link.description && (
                        <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                      )}
                      {link.category && (
                        <p className="text-xs text-muted-foreground">{link.category.name}</p>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length > 0 && !isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Không tìm thấy kết quả cho "<strong>{query}</strong>"
            </div>
          ) : query.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nhập từ khóa để tìm kiếm nhanh hệ thống...
            </div>
          ) : null}

          <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="bg-muted border rounded px-1">↑↓</kbd> Chọn</span>
            <span className="flex items-center gap-1"><kbd className="bg-muted border rounded px-1">↵</kbd> Mở</span>
            <span className="flex items-center gap-1"><kbd className="bg-muted border rounded px-1">Esc</kbd> Đóng</span>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  )
}

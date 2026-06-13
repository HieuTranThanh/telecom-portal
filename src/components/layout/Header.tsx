import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Keyboard, LogIn, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CommandPalette } from '@/components/common/CommandPalette'
import { usePortalSettings } from '@/features/settings/useSettings'
import { APP_NAME } from '@/constants'

export function Header() {
  const [query, setQuery] = useState('')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const navigate = useNavigate()
  const { data: settings } = usePortalSettings()
  const portalName = settings?.portal_name || APP_NAME
  const logoUrl = settings?.logo_url || ''

  useEffect(() => {
    setLogoError(false)
  }, [logoUrl])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt=""
                className="h-8 w-8 object-contain rounded-lg"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Radio className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <span className="hidden font-semibold text-sm md:block">{portalName}</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm kiếm hệ thống, tài liệu, công cụ..."
                className="pl-9 pr-4 sm:pr-24 h-10 bg-muted/50 border-transparent focus:bg-background focus:border-input"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCmdOpen(true)}
                  className="hidden sm:flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
                >
                  <Keyboard className="h-3 w-3" />
                  <span>K</span>
                </button>
              </div>
            </div>
          </form>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">
                <LogIn className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}

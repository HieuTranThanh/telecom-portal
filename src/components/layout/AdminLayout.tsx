import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Link2, LayoutGrid, FolderOpen, Upload, Download,
  Activity, Bell, Settings, LogOut, Radio, Menu, Tags,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth, SESSION_KEY, SESSION_DURATION_MS } from '@/features/auth/AuthContext'
import { usePortalSettings } from '@/features/settings/useSettings'
import { APP_NAME } from '@/constants'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Profile } from '@/types'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/links', icon: Link2, label: 'Quản lý Link' },
  { to: '/admin/quick-access', icon: LayoutGrid, label: 'Quick Access' },
  { to: '/admin/categories', icon: FolderOpen, label: 'Danh mục' },
  { to: '/admin/tags', icon: Tags, label: 'Tags' },
  { to: '/admin/announcements', icon: Bell, label: 'Thông báo' },
  { to: '/admin/health-check', icon: Activity, label: 'Kiểm tra Link' },
  { to: '/admin/import', icon: Upload, label: 'Import' },
  { to: '/admin/export', icon: Download, label: 'Export' },
  { to: '/admin/settings', icon: Settings, label: 'Cài đặt' },
]

interface SidebarContentProps {
  profile: Profile | null
  onSignOut: () => void
  onNavClick: () => void
}

function SidebarContent({ profile, onSignOut, onNavClick }: SidebarContentProps) {
  const { data: settings } = usePortalSettings()
  const logoUrl = settings?.logo_url || ''
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    setLogoError(false)
  }, [logoUrl])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 h-16 px-4 border-b flex-shrink-0">
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" className="h-7 w-7 object-contain rounded-md" onError={() => setLogoError(true)} />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Radio className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        )}
        <div>
          <p className="text-xs font-semibold leading-none">Admin Portal</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{settings?.portal_name || APP_NAME}</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavClick}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 hover:bg-accent transition-colors text-left">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">Quản trị viên</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/" onClick={onNavClick}>Xem portal</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Kiểm tra session mỗi phút — xử lý trường hợp tab mở quá 24h
  const signOutRef = useRef(handleSignOut)
  useEffect(() => { signOutRef.current = handleSignOut })
  useEffect(() => {
    const interval = setInterval(() => {
      const t = localStorage.getItem(SESSION_KEY)
      if (t && Date.now() - parseInt(t) > SESSION_DURATION_MS) {
        toast.warning('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.')
        signOutRef.current()
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r bg-background flex-shrink-0">
        <SidebarContent
          profile={profile}
          onSignOut={handleSignOut}
          onNavClick={() => {}}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 flex flex-col w-56 border-r bg-background">
            <SidebarContent
              profile={profile}
              onSignOut={handleSignOut}
              onNavClick={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-14 border-b bg-background flex items-center gap-3 px-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="text-muted-foreground">
              Xem portal
            </Link>
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

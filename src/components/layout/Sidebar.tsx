import { NavLink } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useCategories } from '@/features/categories/useCategories'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export function Sidebar() {
  const { data: categories, isLoading } = useCategories(true)

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r bg-background/50 min-h-[calc(100vh-4rem)] sticky top-16">
      <nav className="flex flex-col gap-1 p-3 overflow-y-auto scrollbar-thin">
        <NavLink
          to="/"
          end
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          <span>Trang chủ</span>
        </NavLink>

        {isLoading ? (
          <div className="space-y-1 mt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          categories?.map(cat => (
            <NavLink
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors group',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <span className="text-base flex-shrink-0 w-5 text-center">{cat.icon || '📁'}</span>
              <span className="flex-1 truncate">{cat.name}</span>
              {cat.link_count !== undefined && cat.link_count > 0 && (
                <span className="text-xs opacity-60">{cat.link_count}</span>
              )}
            </NavLink>
          ))
        )}
      </nav>
    </aside>
  )
}

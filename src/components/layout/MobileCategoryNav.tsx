import { NavLink } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useCategories } from '@/features/categories/useCategories'

export function MobileCategoryNav() {
  const { data: categories } = useCategories(true)

  return (
    <div className="md:hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-16 z-20">
      <div className="flex items-center overflow-x-auto scrollbar-none px-2 py-1.5 gap-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            [
              'flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            ].join(' ')
          }
        >
          <Home className="h-3.5 w-3.5" />
          <span>Trang chủ</span>
        </NavLink>

        {categories?.map(cat => (
          <NavLink
            key={cat.id}
            to={`/category/${cat.slug}`}
            className={({ isActive }) =>
              [
                'flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              ].join(' ')
            }
          >
            <span className="text-sm leading-none">{cat.icon || '📁'}</span>
            <span>{cat.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

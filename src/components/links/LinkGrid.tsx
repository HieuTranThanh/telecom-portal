import { Link } from '@/types'
import { LinkCard } from './LinkCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Link2Off } from 'lucide-react'

interface LinkGridProps {
  links: Link[]
  emptyTitle?: string
  emptyDescription?: string
  compact?: boolean
  onRemove?: (id: string) => void
}

export function LinkGrid({ links, emptyTitle, emptyDescription, compact, onRemove }: LinkGridProps) {
  if (links.length === 0) {
    return (
      <EmptyState
        icon={Link2Off}
        title={emptyTitle || 'Chưa có link nào'}
        description={emptyDescription || 'Chưa có link nào trong danh mục này.'}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {links.map(link => (
        <LinkCard key={link.id} link={link} compact={compact} onRemove={onRemove} />
      ))}
    </div>
  )
}

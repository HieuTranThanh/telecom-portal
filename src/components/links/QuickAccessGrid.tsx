import { QuickAccessCard } from './QuickAccessCard'
import { Link } from '@/types'

interface QuickAccessGridProps {
  links: Link[]
  showPin?: boolean
}

export function QuickAccessGrid({ links, showPin = true }: QuickAccessGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
      {links.map(link => (
        <QuickAccessCard key={link.id} link={link} showPin={showPin} />
      ))}
    </div>
  )
}

import { HealthStatus, BusinessStatus } from '@/types'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

interface HealthStatusBadgeProps {
  status: HealthStatus
  className?: string
}

export function HealthStatusBadge({ status, className }: HealthStatusBadgeProps) {
  const config: Record<HealthStatus, { label: string; variant: 'success' | 'destructive' | 'warning' }> = {
    online: { label: 'Online', variant: 'success' },
    offline: { label: 'Offline', variant: 'destructive' },
    unknown: { label: 'Không rõ', variant: 'warning' },
  }
  const { label, variant } = config[status] || config.unknown

  const variantClass = {
    success: 'bg-green-100 text-green-700 border-green-200',
    destructive: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
  }[variant]

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border', variantClass, className)}>
      <span className={cn('mr-1 h-1.5 w-1.5 rounded-full', {
        'bg-green-500': variant === 'success',
        'bg-red-500': variant === 'destructive',
        'bg-amber-500': variant === 'warning',
      })} />
      {label}
    </span>
  )
}

export function InternalBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200', className)}>
      <Lock className="h-3 w-3" />
      VPN
    </span>
  )
}

interface BusinessStatusBadgeProps {
  status: BusinessStatus
  className?: string
}

export function BusinessStatusBadge({ status, className }: BusinessStatusBadgeProps) {
  const config: Record<BusinessStatus, { label: string; class: string }> = {
    active: { label: 'Hoạt động', class: 'bg-green-100 text-green-700 border-green-200' },
    suspended: { label: 'Tạm ngưng', class: 'bg-gray-100 text-gray-600 border-gray-200' },
    expired: { label: 'Hết hạn', class: 'bg-orange-100 text-orange-700 border-orange-200' },
  }
  const { label, class: cls } = config[status] || config.active

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border', cls, className)}>
      {label}
    </span>
  )
}

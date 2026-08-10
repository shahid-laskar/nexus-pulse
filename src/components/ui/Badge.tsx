import { cn } from '@/lib/utils'
import type { CustomerStatus, RoleName } from '@/types'

const ROLE_COLORS: Record<RoleName, string> = {
  SUPER_ADMIN:  'bg-chart-1/10 text-chart-1',
  CIRCLE_ADMIN: 'bg-chart-2/10 text-chart-2',
  BA_ADMIN:     'bg-chart-3/10 text-chart-3',
  BA_NOC_ADMIN: 'bg-chart-4/10 text-chart-4',
  BA_EB_ADMIN:  'bg-chart-5/10 text-chart-5',
  CUSTOMER:     'bg-surface-2 text-muted-foreground',
}

const STATUS_COLORS: Record<CustomerStatus, string> = {
  DRAFT:    'bg-surface-2 text-muted-foreground',
  READY:    'bg-neutral-soft text-neutral',
  PUSHED:   'bg-warn-soft text-warn',
  ACTIVE:   'bg-healthy-soft text-healthy',
  INACTIVE: 'bg-critical-soft text-critical',
}

interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
        {
          'bg-surface-2 text-muted-foreground':   variant === 'default',
          'bg-healthy-soft text-healthy':         variant === 'success',
          'bg-warn-soft text-warn':               variant === 'warning',
          'bg-critical-soft text-critical':       variant === 'danger',
          'bg-neutral-soft text-neutral':         variant === 'info',
        },
        className
      )}
    >
      {label}
    </span>
  )
}

export function RoleBadge({ role }: { role: RoleName }) {
  const label = role.replace(/_/g, ' ')
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
      ROLE_COLORS[role]
    )}>
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
      STATUS_COLORS[status]
    )}>
      {status}
    </span>
  )
}

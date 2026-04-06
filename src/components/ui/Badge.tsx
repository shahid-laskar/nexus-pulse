import { clsx } from 'clsx'
import type { CustomerStatus, RoleName } from '@/types'

const ROLE_COLORS: Record<RoleName, string> = {
  SUPER_ADMIN:  'bg-amber-100 text-amber-800',
  CIRCLE_ADMIN: 'bg-cyan-100 text-cyan-800',
  BA_ADMIN:     'bg-green-100 text-green-800',
  BA_NOC_ADMIN: 'bg-blue-100 text-blue-800',
  BA_EB_ADMIN:  'bg-orange-100 text-orange-800',
  CUSTOMER:     'bg-gray-100 text-gray-700',
}

const STATUS_COLORS: Record<CustomerStatus, string> = {
  DRAFT:    'bg-gray-100 text-gray-700',
  READY:    'bg-yellow-100 text-yellow-800',
  PUSHED:   'bg-blue-100 text-blue-800',
  ACTIVE:   'bg-green-100 text-green-800',
  INACTIVE: 'bg-red-100 text-red-700',
}

interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
        {
          'bg-gray-100 text-gray-700':   variant === 'default',
          'bg-green-100 text-green-800': variant === 'success',
          'bg-yellow-100 text-yellow-800': variant === 'warning',
          'bg-red-100 text-red-700':     variant === 'danger',
          'bg-blue-100 text-blue-800':   variant === 'info',
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
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
      ROLE_COLORS[role]
    )}>
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
      STATUS_COLORS[status]
    )}>
      {status}
    </span>
  )
}

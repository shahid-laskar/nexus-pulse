import { cn } from '@/lib/utils'
import type { CustomerStatus, RoleName, ChangeRequestStatus, ChangeRequestType } from '@/types'

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

const CR_STATUS_COLORS: Record<ChangeRequestStatus, string> = {
  PENDING:           'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  IN_REVIEW:         'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  NEEDS_INFO:        'bg-purple-500/10 text-purple-600 border border-purple-500/20',
  APPROVED_APPLYING: 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 animate-pulse',
  APPLIED:           'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  REJECTED:          'bg-rose-500/10 text-rose-600 border border-rose-500/20',
}

const CR_TYPE_LABELS: Record<ChangeRequestType, string> = {
  PORTAL_SETTINGS:   'Portal Settings',
  SESSION_POLICY:    'Session Policy',
  BANDWIDTH_PROFILE: 'Bandwidth Profiles',
  AUTH_OPTIONS:      'Auth Options',
  QOS:               'QoS & Bandwidth',
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

export function ChangeRequestStatusBadge({ status }: { status: ChangeRequestStatus }) {
  const label = status.replace(/_/g, ' ')
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider',
      CR_STATUS_COLORS[status] || 'bg-surface-2 text-muted-foreground'
    )}>
      {label}
    </span>
  )
}

export function ChangeRequestTypeBadge({ type }: { type: ChangeRequestType }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {CR_TYPE_LABELS[type] || type}
    </span>
  )
}


import { cn } from '@/lib/utils'
import type { CustomerStatus, RoleName, ChangeRequestStatus, ChangeRequestType } from '@/types'

const ROLE_COLORS: Record<RoleName, string> = {
  SUPER_ADMIN:  'bg-blue-50 text-blue-700 border border-blue-200',
  CIRCLE_ADMIN: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  BA_ADMIN:     'bg-purple-50 text-purple-700 border border-purple-200',
  BA_NOC_ADMIN: 'bg-amber-50 text-amber-700 border border-amber-200',
  BA_EB_ADMIN:  'bg-indigo-50 text-indigo-700 border border-indigo-200',
  CUSTOMER:     'bg-slate-100 text-slate-600 border border-slate-200',
}

const STATUS_COLORS: Record<CustomerStatus, string> = {
  DRAFT:              'bg-slate-100 text-slate-600 border border-slate-200',
  READY:              'bg-blue-50 text-blue-700 border border-blue-200',
  NETWORK_CONFIGURED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  PUSHED:             'bg-amber-50 text-amber-700 border border-amber-200',
  ACTIVE:             'bg-emerald-50 text-emerald-700 border border-emerald-200',
  INACTIVE:           'bg-rose-50 text-rose-700 border border-rose-200',
}

const CR_STATUS_COLORS: Record<ChangeRequestStatus, string> = {
  PENDING:           'bg-amber-50 text-amber-700 border border-amber-200',
  IN_REVIEW:         'bg-blue-50 text-blue-700 border border-blue-200',
  NEEDS_INFO:        'bg-purple-50 text-purple-700 border border-purple-200',
  APPROVED_APPLYING: 'bg-cyan-50 text-cyan-700 border border-cyan-200 animate-pulse',
  APPLIED:           'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REJECTED:          'bg-rose-50 text-rose-700 border border-rose-200',
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
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider',
        {
          'bg-slate-100 text-slate-600 border border-slate-200':   variant === 'default',
          'bg-emerald-50 text-emerald-700 border border-emerald-200': variant === 'success',
          'bg-amber-50 text-amber-700 border border-amber-200':   variant === 'warning',
          'bg-rose-50 text-rose-700 border border-rose-200':       variant === 'danger',
          'bg-blue-50 text-blue-700 border border-blue-200':       variant === 'info',
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
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider',
      ROLE_COLORS[role]
    )}>
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider',
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
      'inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider',
      CR_STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 border border-slate-200'
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


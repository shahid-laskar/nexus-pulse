import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import type { CustomerStatus, RoleName, ChangeRequestStatus, ChangeRequestType } from '@/types'

const base =
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider border'

const TONES = {
  default: 'bg-surface-2 text-muted-foreground border-hairline',
  success: 'bg-healthy-soft text-healthy border-transparent',
  warning: 'bg-warn-soft text-warn border-transparent',
  danger: 'bg-critical-soft text-critical border-transparent',
  info: 'bg-primary/10 text-primary border-transparent',
  accent: 'bg-chart-3/12 text-chart-3 border-transparent',
} as const

export type BadgeTone = keyof typeof TONES

const ROLE_TONES: Record<RoleName, BadgeTone> = {
  SUPER_ADMIN: 'info',
  CIRCLE_ADMIN: 'accent',
  BA_ADMIN: 'accent',
  BA_NOC_ADMIN: 'warning',
  BA_EB_ADMIN: 'info',
  CUSTOMER: 'default',
}

const STATUS_TONES: Record<CustomerStatus, BadgeTone> = {
  DRAFT: 'default',
  READY: 'info',
  NETWORK_CONFIGURED: 'accent',
  PUSHED: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'danger',
}

const CR_STATUS_TONES: Record<ChangeRequestStatus, BadgeTone> = {
  PENDING: 'warning',
  IN_REVIEW: 'info',
  NEEDS_INFO: 'accent',
  APPROVED_APPLYING: 'info',
  APPLIED: 'success',
  REJECTED: 'danger',
}

const CR_TYPE_LABELS: Record<ChangeRequestType, string> = {
  PORTAL_SETTINGS: 'Portal Settings',
  SESSION_POLICY: 'Session Policy',
  BANDWIDTH_PROFILE: 'Bandwidth Profiles',
  AUTH_OPTIONS: 'Auth Options',
  QOS: 'QoS & Bandwidth',
}

interface BadgeProps {
  label?: string
  children?: ReactNode
  variant?: BadgeTone
  dot?: boolean
  className?: string
}

export function Badge({ label, children, variant = 'default', dot, className }: BadgeProps) {
  return (
    <span className={cn(base, TONES[variant], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children ?? label}
    </span>
  )
}

export function RoleBadge({ role }: { role: RoleName }) {
  return <Badge variant={ROLE_TONES[role] ?? 'default'} label={role.replace(/_/g, ' ')} />
}

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return <Badge dot variant={STATUS_TONES[status] ?? 'default'} label={status.replace(/_/g, ' ')} />
}

export function ChangeRequestStatusBadge({ status }: { status: ChangeRequestStatus }) {
  return (
    <Badge
      dot
      variant={CR_STATUS_TONES[status] ?? 'default'}
      label={status.replace(/_/g, ' ')}
      className={status === 'APPROVED_APPLYING' ? 'animate-pulse' : undefined}
    />
  )
}

export function ChangeRequestTypeBadge({ type }: { type: ChangeRequestType }) {
  return <Badge variant="default" label={CR_TYPE_LABELS[type] || type} />
}

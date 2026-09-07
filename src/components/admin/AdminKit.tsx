import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge, type BadgeTone } from '@/components/ui/Badge'

/** Responsive KPI strip used across the commercial admin screens. */
export function KpiRow({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 | 5 }) {
  return (
    <div
      className={cn(
        'grid gap-3 grid-cols-1 sm:grid-cols-2',
        cols === 3 && 'lg:grid-cols-3',
        cols === 4 && 'lg:grid-cols-4',
        cols === 5 && 'lg:grid-cols-3 xl:grid-cols-5'
      )}
    >
      {children}
    </div>
  )
}

/** Search + filter row that sits above a table. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-hairline bg-card p-3">
      {children}
    </div>
  )
}

const TONE_BY_STATE: Record<string, BadgeTone> = {
  online: 'success',
  active: 'success',
  paid: 'success',
  healthy: 'success',
  published: 'success',
  redeemed: 'info',
  issued: 'info',
  draft: 'default',
  unused: 'default',
  idle: 'default',
  degraded: 'warning',
  pending: 'warning',
  due: 'warning',
  expiring: 'warning',
  offline: 'danger',
  failed: 'danger',
  overdue: 'danger',
  expired: 'danger',
  suspended: 'danger',
}

export function StatePill({ state }: { state: string }) {
  const tone = TONE_BY_STATE[state.toLowerCase()] ?? 'default'
  return (
    <Badge variant={tone} dot>
      {state}
    </Badge>
  )
}

/** Small labelled figure used inside panels. */
export function MiniStat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-1 text-[15px] font-semibold tnum text-foreground', tone)}>{value}</p>
    </div>
  )
}

/** Horizontal usage/utilisation bar. */
export function UsageBar({ value }: { value: number }) {
  const tone = value > 85 ? 'bg-critical' : value > 65 ? 'bg-warn' : 'bg-healthy'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[90px] overflow-hidden rounded-full bg-surface-2">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="tnum w-9 text-right text-[11px] text-muted-foreground">{value}%</span>
    </div>
  )
}

export const inr = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

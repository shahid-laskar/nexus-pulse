import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center', className)}>
      {Icon && (
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-hairline bg-surface-2 text-muted-foreground">
          <Icon className="h-4.5 w-4.5" />
        </span>
      )}
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded border border-hairline bg-surface-2 px-1 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  )
}

export function ProgressBar({
  value,
  tone = 'primary',
  className,
}: {
  value: number
  tone?: 'primary' | 'healthy' | 'warn' | 'critical'
  className?: string
}) {
  const bg = {
    primary: 'bg-primary',
    healthy: 'bg-healthy',
    warn: 'bg-warn',
    critical: 'bg-critical',
  }[tone]
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-300 ease-standard', bg)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

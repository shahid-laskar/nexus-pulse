import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface TabItem<T extends string = string> {
  value: T
  label: ReactNode
  count?: number
  icon?: ReactNode
}

/** Underlined page-level tabs. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-hairline overflow-x-auto', className)} role="tablist">
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn(
              'relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[12.5px] font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {it.icon}
            {it.label}
            {typeof it.count === 'number' && (
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] tnum text-muted-foreground">
                {it.count}
              </span>
            )}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}

/** Compact segmented control for view switches and ranges. */
export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-lg border border-hairline bg-surface-2 p-0.5', className)}>
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            aria-pressed={active}
            className={cn(
              'rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors',
              active
                ? 'bg-surface text-foreground shadow-[0_1px_2px_0_oklch(0_0_0/0.06)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

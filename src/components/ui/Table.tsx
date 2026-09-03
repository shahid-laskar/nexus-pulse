import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-x-auto w-full rounded-xl border border-hairline bg-card shadow-[0_1px_2px_0_oklch(0_0_0/0.04)]',
        className
      )}
    >
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  )
}

export function Th({
  children,
  className,
  align,
}: {
  children?: ReactNode
  className?: string
  align?: 'right' | 'center'
}) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em]',
        'text-muted-foreground bg-surface-2/70 border-b border-hairline sticky top-0 z-10 backdrop-blur',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  align,
}: {
  children?: ReactNode
  className?: string
  align?: 'right' | 'center'
}) {
  return (
    <td
      className={cn(
        'px-4 py-2.5 text-foreground/90 border-b border-hairline/70 text-[12px] align-middle',
        align === 'right' && 'text-right tnum',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  )
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors hover:bg-surface-2/60',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </tr>
  )
}

export function EmptyRow({
  cols,
  message = 'No data found',
  hint,
  action,
}: {
  cols: number
  message?: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <tr>
      <td colSpan={cols} className="py-14 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-foreground">
            <Inbox className="h-4 w-4" />
          </span>
          <p className="text-[12.5px] font-medium text-foreground">{message}</p>
          {hint && <p className="text-[11.5px] text-muted-foreground max-w-xs">{hint}</p>}
          {action && <div className="mt-1">{action}</div>}
        </div>
      </td>
    </tr>
  )
}

export function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3 border-b border-hairline/70">
              <div className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${40 + ((r + c) % 4) * 15}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

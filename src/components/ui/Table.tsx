import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn(
      'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider',
      'text-muted-foreground bg-surface-2 border-b border-hairline',
      className
    )}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn('px-4 py-3 text-foreground border-b border-hairline/50 last:border-b-0', className)}>
      {children}
    </td>
  )
}

export function EmptyRow({ cols, message = 'No data found' }: { cols: number; message?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-12 text-center text-muted-foreground">
        {message}
      </td>
    </tr>
  )
}

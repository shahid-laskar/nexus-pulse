import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto w-full rounded-xl border border-slate-200 bg-white shadow-2xs', className)}>
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn(
      'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider',
      'text-slate-600 bg-slate-50/80 border-b border-slate-200',
      className
    )}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn('px-4 py-3 text-slate-700 border-b border-slate-100 last:border-b-0 text-xs', className)}>
      {children}
    </td>
  )
}

export function EmptyRow({ cols, message = 'No data found' }: { cols: number; message?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-12 text-center text-xs text-slate-400">
        {message}
      </td>
    </tr>
  )
}


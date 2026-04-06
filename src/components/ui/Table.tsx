import { clsx } from 'clsx'
import type { ReactNode } from 'react'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#d0d8ec] bg-white">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={clsx(
      'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider',
      'text-[#6b7ea8] bg-[#f4f6fb] border-b border-[#d0d8ec]',
      className
    )}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={clsx('px-4 py-3 text-[#1a2340] border-b border-[#f0f4fc] last:border-b-0', className)}>
      {children}
    </td>
  )
}

export function EmptyRow({ cols, message = 'No data found' }: { cols: number; message?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-12 text-center text-[#6b7ea8]">
        {message}
      </td>
    </tr>
  )
}

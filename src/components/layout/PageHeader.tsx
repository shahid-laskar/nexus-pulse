import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title:        string
  subtitle?:    string
  description?: string
  actions?:     ReactNode
  className?:   string
}

export function PageHeader({ title, subtitle, description, actions, className }: PageHeaderProps) {
  const sub = subtitle || description
  return (
    <div className={cn('bg-white border-b border-slate-200 px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3', className)}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  )
}


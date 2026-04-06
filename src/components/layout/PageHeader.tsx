import type { ReactNode } from 'react'

interface PageHeaderProps {
  title:       string
  subtitle?:   string
  actions?:    ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-[#d0d8ec] px-8 py-5 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-[#1a2340]">{title}</h1>
        {subtitle && <p className="text-xs text-[#6b7ea8] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}

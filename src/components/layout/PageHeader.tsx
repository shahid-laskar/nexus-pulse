import type { ReactNode } from 'react'

interface PageHeaderProps {
  title:        string
  subtitle?:    string
  description?: string
  actions?:     ReactNode
}

export function PageHeader({ title, subtitle, description, actions }: PageHeaderProps) {
  const sub = subtitle || description
  return (
    <div className="bg-background border-b border-hairline px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        {sub && <p className="text-[13px] text-muted-foreground mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  description?: string
  actions?: ReactNode
  /** Optional filter/tab row rendered under the title block. */
  toolbar?: ReactNode
  className?: string
  sticky?: boolean
}

export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  toolbar,
  className,
  sticky = true,
}: PageHeaderProps) {
  const sub = subtitle || description
  return (
    <div
      className={cn(
        'bg-surface/85 backdrop-blur border-b border-hairline px-5 lg:px-7 pt-4 pb-3',
        sticky && 'sticky top-14 z-30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">{title}</h1>
          {sub && <p className="mt-0.5 text-[12px] text-muted-foreground max-w-2xl">{sub}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {toolbar && <div className="mt-3">{toolbar}</div>}
    </div>
  )
}

/** Standard page body wrapper: consistent gutters and vertical rhythm. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 lg:px-7 py-5 space-y-5', className)}>{children}</div>
}

import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Removes the default surface elevation */
  flat?: boolean
}

export function Card({ children, className, flat, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-xl border border-hairline overflow-hidden',
        !flat && 'shadow-[0_1px_2px_0_oklch(0_0_0/0.04)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
  actions,
}: {
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-hairline flex items-center justify-between gap-3',
        className
      )}
    >
      <div className="min-w-0">{children}</div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-[13px] font-semibold tracking-tight text-foreground', className)}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[11.5px] text-muted-foreground mt-0.5', className)}>{children}</p>
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-4', className)}>{children}</div>
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 py-3 border-t border-hairline bg-surface-2/60 flex items-center gap-2', className)}>
      {children}
    </div>
  )
}

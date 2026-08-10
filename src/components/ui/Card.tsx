import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-surface/80 backdrop-blur-sm rounded-xl border border-hairline shadow-sm overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4 border-b border-hairline bg-surface/50', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

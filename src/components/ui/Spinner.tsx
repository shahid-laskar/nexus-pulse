import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin h-5 w-5 text-muted-foreground', className)} />
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-64 text-muted-foreground">
      <Spinner className="h-6 w-6 text-primary" />
      <p className="text-[11.5px] uppercase tracking-[0.14em]">{label}</p>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-2', className)} />
}

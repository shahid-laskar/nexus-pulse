import { cn } from '@/lib/utils'

interface StatCardProps {
  label:      string
  value:      string | number
  sub?:       string
  color?:     'default' | 'green' | 'yellow' | 'red' | 'blue'
}

const colorMap = {
  default: 'text-foreground',
  green:   'text-healthy',
  yellow:  'text-warn',
  red:     'text-critical',
  blue:    'text-primary',
}

export function StatCard({ label, value, sub, color = 'default' }: StatCardProps) {
  return (
    <div className="bg-surface/80 backdrop-blur-sm rounded-xl border border-hairline p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </p>
      <p className={cn('text-3xl font-bold tracking-tight', colorMap[color])}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

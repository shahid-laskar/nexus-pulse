import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'amber' | 'emerald'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: Tone
  icon?: LucideIcon
  iconColor?: string
  /** Percentage delta vs previous period, e.g. 12.4 or -3.1 */
  delta?: number
  /** Sparkline series, rendered as an inline SVG trend */
  series?: number[]
  className?: string
  onClick?: () => void
}

const TONE: Record<Tone, { text: string; chip: string }> = {
  default: { text: 'text-foreground', chip: 'bg-surface-2 text-muted-foreground' },
  green: { text: 'text-healthy', chip: 'bg-healthy-soft text-healthy' },
  emerald: { text: 'text-healthy', chip: 'bg-healthy-soft text-healthy' },
  yellow: { text: 'text-warn', chip: 'bg-warn-soft text-warn' },
  amber: { text: 'text-warn', chip: 'bg-warn-soft text-warn' },
  red: { text: 'text-critical', chip: 'bg-critical-soft text-critical' },
  blue: { text: 'text-primary', chip: 'bg-primary/10 text-primary' },
  purple: { text: 'text-chart-3', chip: 'bg-chart-3/12 text-chart-3' },
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / span) * 26}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn('h-7 w-20', className)}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function StatCard({
  label,
  value,
  sub,
  color = 'default',
  icon: Icon,
  delta,
  series,
  className,
  onClick,
}: StatCardProps) {
  const tone = TONE[color] ?? TONE.default
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'group relative w-full text-left bg-card rounded-xl border border-hairline p-4',
        'shadow-[0_1px_2px_0_oklch(0_0_0/0.04)] transition-colors',
        onClick && 'hover:border-primary/40 cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span className={cn('grid h-6 w-6 place-items-center rounded-md', tone.chip)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div>
          <p className={cn('text-2xl font-semibold tracking-tight tnum leading-none', tone.text)}>
            {value}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            {typeof delta === 'number' && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[11px] font-medium tnum',
                  delta >= 0 ? 'text-healthy' : 'text-critical'
                )}
              >
                {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
            {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
          </div>
        </div>
        {series && <Sparkline data={series} className={tone.text} />}
      </div>
    </Comp>
  )
}

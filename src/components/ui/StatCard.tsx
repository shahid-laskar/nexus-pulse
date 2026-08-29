import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label:      string
  value:      string | number
  sub?:       string
  color?:     'default' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'amber' | 'emerald'
  icon?:      LucideIcon
  iconColor?: string
  className?: string
}

const valueColorMap = {
  default: 'text-slate-900',
  green:   'text-emerald-600',
  emerald: 'text-emerald-600',
  yellow:  'text-amber-600',
  amber:   'text-amber-600',
  red:     'text-rose-600',
  blue:    'text-blue-600',
  purple:  'text-purple-600',
}

const iconBgMap = {
  default: 'bg-slate-100 text-slate-600',
  green:   'bg-emerald-50 text-emerald-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  yellow:  'bg-amber-50 text-amber-600',
  amber:   'bg-amber-50 text-amber-600',
  red:     'bg-rose-50 text-rose-600',
  blue:    'bg-blue-50 text-blue-600',
  purple:  'bg-purple-50 text-purple-600',
}

export function StatCard({ label, value, sub, color = 'default', icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all p-5 flex items-center justify-between', className)}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <h4 className={cn('text-2xl font-bold mt-0.5 tracking-tight', valueColorMap[color])}>
          {value}
        </h4>
        {sub && <p className="text-[11.5px] text-slate-400 mt-1">{sub}</p>}
      </div>
      {Icon && (
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', iconBgMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}


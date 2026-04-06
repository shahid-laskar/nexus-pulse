import { clsx } from 'clsx'

interface StatCardProps {
  label:      string
  value:      string | number
  sub?:       string
  color?:     'default' | 'green' | 'yellow' | 'red' | 'blue'
}

const colorMap = {
  default: 'text-[#1a2340]',
  green:   'text-green-700',
  yellow:  'text-yellow-700',
  red:     'text-red-700',
  blue:    'text-blue-700',
}

export function StatCard({ label, value, sub, color = 'default' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#d0d8ec] p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-[#6b7ea8] mb-2">
        {label}
      </p>
      <p className={clsx('text-4xl font-bold leading-none', colorMap[color])}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#6b7ea8] mt-1.5">{sub}</p>}
    </div>
  )
}

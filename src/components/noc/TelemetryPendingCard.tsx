import { Activity, Radio, Cpu, LineChart, AlertCircle } from 'lucide-react'
import { Panel } from '@/components/pulse/primitives'
import { cn } from '@/lib/utils'

interface TelemetryPendingCardProps {
  title: string
  description?: string
  message?: string
  collector?: string
  icon?: React.ElementType
  className?: string
  height?: string
}

export function TelemetryPendingCard({
  title,
  description = 'Live telemetry pipeline status',
  message = 'Requires NetFlow/Prometheus ingestion collector.',
  collector,
  icon: Icon = Activity,
  className,
  height = 'h-[200px]',
}: TelemetryPendingCardProps) {
  return (
    <Panel
      title={title}
      description={description}
      className={className}
      actions={
        <span className="inline-flex items-center gap-1 text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <Radio className="w-3 h-3 text-amber-500 animate-pulse" />
          Telemetry Pipeline Pending
        </span>
      }
    >
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40',
          height
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-3 shadow-2xs text-slate-500">
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-sm mb-1">
          {message}
        </p>
        <p className="text-[11px] text-slate-400 max-w-md font-mono">
          {collector ? `Collector: ${collector}` : 'Telemetry stream will populate automatically once exporter daemon connects.'}
        </p>
      </div>
    </Panel>
  )
}

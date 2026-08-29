import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  BellRing,
  Activity,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { nocApi } from '@/api/noc'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { StatusBadge } from "@/components/pulse/primitives"
import { DataTable } from "@/components/pulse/data-table"
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

function mapSeverity(sev: string) {
  const s = sev?.toUpperCase()
  if (s === 'CRITICAL') return 'critical'
  if (s === 'MAJOR') return 'warn'
  if (s === 'MINOR') return 'neutral'
  return 'neutral'
}

export function NocAlarmsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const qc = useQueryClient()

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['noc-alerts'],
    queryFn: () => nocApi.listAlerts(),
    refetchInterval: 10000,
  })

  const ackMutation = useMutation({
    mutationFn: (id: number) => nocApi.ackAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['noc-alerts'] })
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, "Failed to acknowledge alert"))
    }
  })

  const handleAckMultiple = (selectedIds: string[], clearSelection: () => void) => {
    selectedIds.forEach(id => ackMutation.mutate(Number(id)))
    toast.success(`Acknowledged ${selectedIds.length} alerts`)
    clearSelection()
  }

  const criticalCount = useMemo(() => alerts.filter((a: any) => a.severity?.toUpperCase() === 'CRITICAL').length, [alerts])
  const unackedCount = useMemo(() => alerts.filter((a: any) => a.status !== 'ACKNOWLEDGED').length, [alerts])
  const ackedCount = useMemo(() => alerts.filter((a: any) => a.status === 'ACKNOWLEDGED').length, [alerts])

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader 
        title="Alerts &amp; Fault Management" 
        subtitle="Live telemetry and system alarms aggregated across VyOS edge routers and FreeRADIUS engines" 
      />

      <div className="p-6 lg:p-8 max-w-[1680px] space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Alarms</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{alerts.length}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Recorded signal events</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BellRing className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Critical Alarms</p>
                <h4 className="text-2xl font-bold text-rose-600 mt-0.5">{criticalCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">High severity incidents</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Unacknowledged</p>
                <h4 className="text-2xl font-bold text-amber-600 mt-0.5">{unackedCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Requires NOC review</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Resolved / Acked</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-0.5">{ackedCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Handled by NOC staff</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        <DataTable
          rows={alerts}
          getId={(r: any) => r.id.toString()}
          selectable
          liveHint="Live — fetching directly from bsnl-backend alerts database"
          searchPlaceholder="Filter alerts..."
          bulkActions={(sel, clear) => (
            <>
              <Button 
                onClick={() => handleAckMultiple(sel, clear)} 
                variant="secondary"
                size="xs"
                className="h-7 text-xs"
              >
                Acknowledge Selected
              </Button>
            </>
          )}
          columns={[
            { key: "sev", header: "Severity", render: (r: any) => <StatusBadge status={mapSeverity(r.severity)} /> },
            { key: "title", header: "Title", render: (r: any) => <span className="font-semibold text-slate-900 text-xs">{r.title}</span> },
            { key: "source", header: "Source", render: (r: any) => <span className="font-mono text-[11px] text-slate-500">{r.source}</span> },
            { key: "message", header: "Details", render: (r: any) => <span className="text-slate-600 text-xs whitespace-pre-wrap">{r.message}</span> },
            { key: "inst", header: "Instance", align: "right", render: (r: any) => <span className="font-mono text-xs text-slate-700">{r.instance_id ?? "—"}</span> },
            { key: "created", header: "Timestamp", align: "right", render: (r: any) => <span className="font-mono text-[11px] text-slate-400">{new Date(r.created_at).toLocaleString()}</span> },
            { key: "ack", header: "State", render: (r: any) => (r.status === "ACKNOWLEDGED" ? <span className="text-slate-400 text-xs font-medium">Acked</span> : <span className="text-rose-600 text-xs font-bold animate-pulse">Unacked</span>) },
          ]}
        />
      </div>
    </div>
  )
}


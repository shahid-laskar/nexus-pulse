import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nocApi } from '@/api/noc'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { StatusBadge } from "@/components/pulse/primitives"
import { DataTable } from "@/components/pulse/data-table"
import { toast } from 'react-hot-toast'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'

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

  return (
    <div>
      <PageHeader 
        title="Alerts & Faults" 
        subtitle="Which signals are firing, and are they already grouped?" 
      />
      <div className="p-6 lg:p-8 max-w-[1680px] mx-auto">
        <DataTable
          rows={alerts}
          getId={(r: any) => r.id.toString()}
          selectable
          liveHint="Live — fetching directly from bsnl-backend alerts database"
          searchPlaceholder="Filter alerts..."
          bulkActions={(sel, clear) => (
            <>
              <button 
                onClick={() => handleAckMultiple(sel, clear)} 
                className="rounded-md border border-hairline px-2 py-1 text-[12px] hover:bg-accent"
              >
                Acknowledge
              </button>
            </>
          )}
          columns={[
            { key: "sev", header: "Severity", render: (r: any) => <StatusBadge status={mapSeverity(r.severity)} /> },
            { key: "title", header: "Title", render: (r: any) => <span className="font-medium text-foreground">{r.title}</span> },
            { key: "source", header: "Source", render: (r: any) => <span className="font-mono text-[11.5px] text-muted-foreground">{r.source}</span> },
            { key: "message", header: "Details", render: (r: any) => <span className="text-muted-foreground whitespace-pre-wrap">{r.message}</span> },
            { key: "inst", header: "Instance", align: "right", render: (r: any) => <span className="tnum text-foreground">{r.instance_id ?? "—"}</span> },
            { key: "created", header: "Age", align: "right", render: (r: any) => <span className="tnum text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span> },
            { key: "ack", header: "State", render: (r: any) => (r.status === "ACKNOWLEDGED" ? <span className="text-muted-foreground">acked</span> : <span className="text-critical animate-pulse">unacked</span>) },
          ]}
        />
      </div>
    </div>
  )
}

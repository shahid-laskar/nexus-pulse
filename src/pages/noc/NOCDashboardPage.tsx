// DEPRECATED — content migrated to NOCOperationsPage and NOCProvisioningPage. Remove once wiring is complete.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowUpRight,
  CircleCheck,
  Plus,
  Siren,
  Zap,
} from "lucide-react"

import { customersApi } from '@/api/master-data'
import { nocApi } from '@/api/noc'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'

import {
  Panel,
  StatWidget,
  StatusBadge as PulseStatusBadge,
  StatusDot,
  Pill,
  KeyHint,
} from "@/components/pulse/primitives"
import {
  activity,
  ago,
  alerts,
  fmt,
  heatmap,
  incidents,
  kpis,
  sparkline,
  trafficSeries,
  zoneHealth,
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"

import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import type { InstanceRead, CustomerRead } from '@/types'

function Verdict({
  readyCount,
  isHealthChecking,
  onRunHealthCheck,
}: {
  readyCount: number
  isHealthChecking: boolean
  onRunHealthCheck: () => void
}) {
  const open = incidents.filter((i) => i.status !== "resolved")
  const crit = open.filter((i) => i.severity === "critical").length
  const status = crit ? "critical" : open.length ? "warn" : "healthy"
  const sentence = crit
    ? `${crit} critical incident${crit > 1 ? "s" : ""} in progress — ${fmt.format(
        open.reduce((a, i) => a + i.subscribersAffected, 0),
      )} subscribers affected`
    : "Network nominal — no critical incidents"

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-hairline bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full",
            status === "critical" ? "bg-critical-soft" : "bg-healthy-soft",
          )}
        >
          {status === "critical" ? (
            <Siren className="h-4 w-4 text-critical" />
          ) : (
            <CircleCheck className="h-4 w-4 text-healthy" />
          )}
        </span>
        <div>
          <p className="text-[15px] font-semibold tracking-tight">{sentence}</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {alerts.filter((a) => !a.acked).length} unacknowledged alerts ·{" "}
            {readyCount} provisioning jobs in queue · last evaluated just now
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onRunHealthCheck}
          disabled={isHealthChecking}
          className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-[12px] transition-colors hover:bg-accent disabled:opacity-50"
        >
          {isHealthChecking ? 'Checking...' : 'Run health check'}
        </button>
      </div>
    </div>
  )
}

function AttentionStream() {
  const [acked, setAcked] = useState<string[]>([])
  const open = incidents.filter((i) => i.status !== "resolved")

  return (
    <Panel
      title="Attention stream"
      description="Incidents and unacked alerts, ranked by severity then blast radius"
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-hairline h-[250px] overflow-y-auto">
        {open.map((i) => {
          const isAcked = acked.includes(i.id) || i.status !== "triggered"
          return (
            <li
              key={i.id}
              className="group flex items-start gap-3 px-4 py-3 transition-colors duration-100 hover:bg-accent/40"
            >
              <StatusDot status={i.severity} pulse />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{i.id}</span>
                  <span className="truncate text-[13px] font-medium">{i.title}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                  <span className="tnum font-medium text-foreground">
                    ~{fmt.format(i.subscribersAffected)} subscribers
                  </span>
                  <span>{i.zone}</span>
                  <span className="font-mono">{i.device}</span>
                  <span>{ago(i.ageMin)} old</span>
                  <span>{i.alertCount} alerts grouped</span>
                  {i.owner && <Pill>{i.owner}</Pill>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-100 group-hover:opacity-100 focus-within:opacity-100">
                {!isAcked ? (
                  <button
                    onClick={() => {
                      setAcked((a) => [...a, i.id])
                      toast.success(`${i.id} acknowledged`, {
                        icon: '👀'
                      })
                    }}
                    className="rounded-md border border-hairline bg-surface px-2 py-1 text-[11.5px] transition-colors hover:bg-accent"
                  >
                    Ack <KeyHint>e</KeyHint>
                  </button>
                ) : (
                  <PulseStatusBadge status="neutral">Acked</PulseStatusBadge>
                )}
                <button
                  onClick={() => toast.success(`${i.id} snoozed for 30 minutes`)}
                  className="rounded-md border border-hairline bg-surface px-2 py-1 text-[11.5px] transition-colors hover:bg-accent"
                >
                  Snooze
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function TrafficPanel() {
  return (
    <Panel
      title="Aggregate traffic"
      description="Downstream / upstream across all instances · ghost line is yesterday"
      actions={<Pill>Gbps</Pill>}
    >
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trafficSeries} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="down" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval={11}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-hairline)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <ReferenceLine
              x="02:30"
              stroke="var(--color-critical)"
              strokeDasharray="3 3"
              label={{ value: "INC-2291", fontSize: 10, fill: "var(--color-critical)", position: "top" }}
            />
            <Area
              type="monotone"
              dataKey="baseline"
              stroke="var(--color-muted-foreground)"
              strokeDasharray="3 3"
              strokeWidth={1}
              fill="none"
            />
            <Area
              type="monotone"
              dataKey="down"
              stroke="var(--color-chart-1)"
              strokeWidth={1.6}
              fill="url(#down)"
            />
            <Area
              type="monotone"
              dataKey="up"
              stroke="var(--color-chart-2)"
              strokeWidth={1.4}
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

function Heatmap() {
  const color = (v: number) =>
    v > 75
      ? "bg-critical"
      : v > 55
        ? "bg-warn"
        : v > 32
          ? "bg-primary/45"
          : v > 15
            ? "bg-primary/20"
            : "bg-surface-2"
  return (
    <Panel
      title="Instance load heatmap"
      description="Worst-of CPU / load / uptime deviation · 5-minute buckets, last 3 hours"
    >
      <div className="space-y-1 h-[200px] overflow-y-auto">
        {heatmap.map((row) => (
          <div key={row.device} className="flex items-center gap-2">
            <span className="w-28 shrink-0 truncate font-mono text-[10.5px] text-muted-foreground">
              {row.device}
            </span>
            <div className="flex flex-1 gap-[2px]">
              {row.cells.map((c, i) => (
                <span
                  key={i}
                  title={`${row.device} · bucket ${i + 1} · deviation ${c}`}
                  className={cn(
                    "h-4 flex-1 rounded-[2px] transition-transform duration-100 hover:scale-y-125",
                    color(c),
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function LiveInstancesTable({ instances, loading }: { instances: InstanceRead[], loading: boolean }) {
  if (loading) return <PageLoader />
  if (!instances?.length) return <Card><CardBody className="text-sm text-slate-500">No router instances configured.</CardBody></Card>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {instances.map((inst: InstanceRead) => (
        <InstanceHealthCard key={inst.id} instance={inst} />
      ))}
    </div>
  )
}

function InstanceHealthCard({ instance }: { instance: InstanceRead }) {
  const { data: health, isLoading, isError } = useQuery({
    queryKey: ['noc-health', instance.id],
    queryFn: () => nocApi.health(instance.id),
    refetchInterval: 30_000,
  })

  const { data: metrics } = useQuery({
    queryKey: ['noc-metrics', instance.id],
    queryFn: () => nocApi.getInstanceMetrics(instance.id),
    refetchInterval: 60_000,
  })

  const isOnline = health?.ssh_connected ?? (health?.status === 'ok' || health?.status === 'online')

  return (
    <Card className={cn("border-l-4", isOnline ? 'border-l-healthy' : isError ? 'border-l-critical' : 'border-l-warn')}>
      <CardBody className="p-4 bg-surface">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-foreground text-sm flex items-center gap-2">
            <StatusDot status={isOnline ? 'healthy' : isError ? 'critical' : 'warn'} />
            {instance.name || `Router #${instance.id}`}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {isLoading ? 'Checking...' : isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="text-[11.5px] text-muted-foreground space-y-1 font-mono mb-3">
          <div>Host: {instance.host}</div>
          {health?.latency_ms != null && <div>Latency: {health.latency_ms}ms</div>}
        </div>
        
        {/* Phase 3: Mini Sparklines */}
        {metrics?.history && (
          <div className="h-[40px] w-full mt-2 opacity-80 flex gap-2">
            <div className="flex-1 h-full relative group">
              <span className="absolute top-0 left-0 text-[9px] text-muted-foreground z-10">CPU</span>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.history}>
                  <Area type="monotone" dataKey="cpu" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.2} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 h-full relative group">
              <span className="absolute top-0 left-0 text-[9px] text-muted-foreground z-10">Traffic</span>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.history}>
                  <Area type="monotone" dataKey="traffic" stroke="var(--color-chart-3)" fill="var(--color-chart-3)" fillOpacity={0.2} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export function NOCDashboardPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const qc = useQueryClient()
  const [selectedCustomerForDeboard, setSelectedCustomerForDeboard] = useState<CustomerRead | null>(null)

  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: ['noc-instances'],
    queryFn: () => nocApi.listInstances(),
  })

  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers', 'noc'],
    queryFn: () => customersApi.list({ limit: 200 }),
  })

  const runHealthCheckMutation = useMutation({
    mutationFn: async () => {
      let targetInstances = instances
      if (!targetInstances || targetInstances.length === 0) {
        targetInstances = await nocApi.listInstances()
      }
      if (!targetInstances || targetInstances.length === 0) {
        throw new Error('No router instances configured to check')
      }
      const results = await Promise.allSettled(
        targetInstances.map((inst) => nocApi.health(inst.id))
      )
      return { targetInstances, results }
    },
    onSuccess: ({ targetInstances, results }) => {
      qc.invalidateQueries({ queryKey: ['noc-health'] })
      qc.invalidateQueries({ queryKey: ['noc-instances'] })

      const failed = results.filter((r) => {
        if (r.status === 'rejected') return true
        const val = r.value
        return !val || (val.ssh_connected === false) || (val.status !== 'ok' && val.status !== 'online' && val.status !== 'reachable')
      })

      if (failed.length === 0) {
        if (targetInstances.length === 1) {
          toast.success(`Health check passed: ${targetInstances[0].name || `Router #${targetInstances[0].id}`} is healthy`)
        } else {
          toast.success(`Health check passed across all ${targetInstances.length} router instances`)
        }
      } else if (failed.length === targetInstances.length) {
        toast.error(`Health check failed: all ${targetInstances.length} router instance(s) unreachable`)
      } else {
        toast.error(`Health check warning: ${failed.length} of ${targetInstances.length} instance(s) failed or degraded`)
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to run health check'))
    },
  })

  const deboard = useMutation({
    mutationFn: (customerId: number) => nocApi.deboard(customerId),
    onSuccess: (res) => {
      toast.success(`Deprovisioned ${res.company_name} from router`)
      qc.invalidateQueries({ queryKey: ['customers'] })
      setSelectedCustomerForDeboard(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to deboard customer')),
  })

  const customers = customersData?.customers ?? []
  const ready     = customers.filter(c => c.status === 'READY')
  const pushed    = customers.filter(c => c.status === 'PUSHED' || c.status === 'ACTIVE')

  const isLoading = loadingInstances || loadingCustomers

  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader
        title="Pulse NOC Dashboard"
        subtitle="Real-time network health, incident triage & operational controls"
        actions={
          <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex">
            Quick actions <KeyHint>.</KeyHint> · Palette <KeyHint>⌘K</KeyHint>
          </span>
        }
      />

      <div className="p-4 lg:p-8 space-y-6">
        <Verdict
          readyCount={ready.length}
          isHealthChecking={runHealthCheckMutation.isPending}
          onRunHealthCheck={() => runHealthCheckMutation.mutate()}
        />

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatWidget
            label="Active Routers"
            value={String(instances?.length ?? 0)}
            delta=""
            status="healthy"
            spark={sparkline(11)}
            note="Instances online"
          />
          <StatWidget
            label="Provisioned Tenants"
            value={String(pushed.length)}
            delta="+2"
            status="healthy"
            spark={sparkline(22)}
            note="Live on routers"
          />
          <StatWidget
            label="Throughput ↓"
            value={String(kpis.throughputDown)}
            unit="Gbps"
            delta="+3.2%"
            spark={sparkline(33)}
            note={`↑ ${kpis.throughputUp} Gbps upstream`}
          />
          <StatWidget
            label="Session churn"
            value={fmt.format(kpis.churn5m)}
            unit="/5m"
            delta="+186%"
            spark={sparkline(44)}
            status="critical"
            note="Spike detected"
          />
          <StatWidget
            label="Provisioning queue"
            value={String(ready.length)}
            spark={sparkline(55)}
            status={ready.length > 5 ? "warn" : "neutral"}
            note="Awaiting onboarding"
          />
        </div>

        {/* Analytics row */}
        <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
          <TrafficPanel />
          <AttentionStream />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
          <Panel title="Live Router Infrastructure" description="Real-time VyOS health probes" bodyClassName="p-4">
            <LiveInstancesTable instances={instances || []} loading={loadingInstances} />
          </Panel>
          <Heatmap />
        </div>

        {/* Ready Queue Table */}
        {ready.length > 0 && (
          <Panel title="Awaiting Provisioning" description={`${ready.length} customers ready to be pushed to routers`} bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm text-left">
                <thead>
                  <tr className="bg-surface-2">
                    <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-hairline text-xs uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-hairline text-xs uppercase tracking-wider">GSTIN</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-hairline text-xs uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-hairline text-xs uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {ready.map(c => (
                    <tr key={c.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/customers/${c.id}`} className="font-medium text-foreground hover:underline">
                          {c.company_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{c.gstin}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">{c.customer_type}</td>
                      <td className="px-4 py-3">
                        <Link to={`/noc/customers/${c.id}/onboard`}>
                          <Button size="sm">Provision →</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Provisioned Customers Table */}
        <Panel title="Provisioned Tenants & Operational Controls" description="Manage active tenants on VyOS routers" bodyClassName="p-0">
          {isLoading ? <div className="p-8"><PageLoader /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm text-left">
                <thead>
                  <tr className="bg-surface-2">
                    <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-hairline text-xs uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-hairline text-xs uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-hairline text-xs uppercase tracking-wider">Captive Slug</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-hairline text-xs uppercase tracking-wider">Instance</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-hairline text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {!pushed.length
                    ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No provisioned tenants found</td></tr>
                    : pushed.map(c => (
                      <tr key={c.id} className="hover:bg-accent/40 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/customers/${c.id}`} className="font-medium text-foreground hover:underline">
                            {c.company_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3">
                          {c.captive_customer_slug
                            ? <code className="text-[11px] bg-surface-2 text-foreground px-1.5 py-0.5 rounded border border-hairline font-mono">{c.captive_customer_slug}</code>
                            : <span className="text-muted-foreground text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 font-mono text-[11.5px] text-muted-foreground">
                          {c.captive_instance_id ? `Inst #${c.captive_instance_id}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <Link to={`/noc/customers/${c.id}/sessions`}>
                              <button className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-[11.5px] transition-colors hover:bg-accent">
                                Operations Panel
                              </button>
                            </Link>
                            <button
                              className="rounded-md border border-critical-soft bg-critical/10 text-critical px-2.5 py-1.5 text-[11.5px] transition-colors hover:bg-critical/20"
                              onClick={() => setSelectedCustomerForDeboard(c)}
                            >
                              Deboard
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Mock Data Note */}
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Zap className="h-3 w-3 text-accent" /> Pulse Analytics (Traffic, Incidents, Heatmap) currently display deterministic mock data.
        </p>
      </div>

      <ConfirmDialog
        isOpen={Boolean(selectedCustomerForDeboard)}
        title={`Deboard ${selectedCustomerForDeboard?.company_name}?`}
        description={`Are you sure you want to deprovision '${selectedCustomerForDeboard?.company_name}'? This will flush active sessions, conntrack, and teardown nftables and TC rules on the router.`}
        confirmText="Deprovision & Deboard"
        variant="danger"
        isLoading={deboard.isPending}
        onConfirm={() => selectedCustomerForDeboard && deboard.mutate(selectedCustomerForDeboard.id)}
        onClose={() => setSelectedCustomerForDeboard(null)}
      />
    </div>
  )
}

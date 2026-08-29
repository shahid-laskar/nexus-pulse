import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Activity,
  CircleCheck,
  Siren,
  Zap,
  Server,
  Users,
  Wifi,
  Terminal,
  RefreshCw,
  Clock,
  AlertTriangle,
  Play,
  Square,
  ShieldAlert,
  ShieldCheck,
  ArrowUpRight,
  Radio,
  Cpu,
  Sliders,
  Search,
  Network,
  Layers,
  ExternalLink,
} from 'lucide-react'

import { customersApi } from '@/api/master-data'
import { nocApi } from '@/api/noc'
import { api } from '@/lib/axios'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'

import { Panel, StatusDot, Pill, KeyHint } from '@/components/pulse/primitives'
import { TelemetryPendingCard } from '@/components/noc/TelemetryPendingCard'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { RouterTopologyModal } from '@/components/noc/RouterTopologyModal'
import type { InstanceRead, CustomerRead } from '@/types'

function formatAge(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  if (isNaN(diffMs)) return '—'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function mapSeverity(sev?: string): 'critical' | 'warn' | 'neutral' | 'healthy' {
  const s = sev?.toUpperCase()
  if (s === 'CRITICAL' || s === 'FATAL') return 'critical'
  if (s === 'MAJOR' || s === 'WARN' || s === 'WARNING') return 'warn'
  return 'neutral'
}

interface LogEntry {
  timestamp: string
  message: string
  level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'FATAL'
}

function guessLogLevel(msg: string): LogEntry['level'] {
  const upper = msg.toUpperCase()
  if (upper.includes('FATAL') || upper.includes('CRITICAL')) return 'FATAL'
  if (upper.includes('ERROR') || upper.includes('ERR')) return 'ERROR'
  if (upper.includes('WARN')) return 'WARN'
  if (upper.includes('DEBUG')) return 'DEBUG'
  return 'INFO'
}

// ── Live Network Verdict Banner ─────────────────────────────────────────────

function LiveVerdict({
  onlineCount,
  totalInstances,
  unackedCount,
  criticalCount,
  readyCount,
  isHealthChecking,
  onRunHealthCheck,
}: {
  onlineCount: number
  totalInstances: number
  unackedCount: number
  criticalCount: number
  readyCount: number
  isHealthChecking: boolean
  onRunHealthCheck: () => void
}) {
  const isCritical = criticalCount > 0
  const isWarn = unackedCount > 0 || onlineCount < totalInstances

  const sentence = isCritical
    ? `${criticalCount} critical alarm${criticalCount > 1 ? 's' : ''} firing — immediate triage required`
    : isWarn
      ? `Network attention needed — ${unackedCount} unacked alert(s), ${onlineCount}/${totalInstances} routers online`
      : `Network nominal — all ${totalInstances} edge router instance(s) online & healthy`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-slate-200 bg-white px-4 py-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid h-9 w-9 place-items-center rounded-full',
            isCritical ? 'bg-rose-50 text-rose-600' : isWarn ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
          )}
        >
          {isCritical ? <Siren className="h-4 w-4" /> : isWarn ? <AlertTriangle className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
        </span>
        <div>
          <p className="text-[14.5px] font-semibold tracking-tight text-slate-900">{sentence}</p>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            {unackedCount} unacknowledged alerts · {onlineCount}/{totalInstances} active probes online · {readyCount} provisioning jobs in queue
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRunHealthCheck}
          disabled={isHealthChecking}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-accent disabled:opacity-50 flex items-center gap-1.5"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isHealthChecking && 'animate-spin')} />
          {isHealthChecking ? 'Probing Routers...' : 'Run Health Check'}
        </button>
      </div>
    </div>
  )
}

// ── Live Alerts & Fault Stream ──────────────────────────────────────────────

function LiveAlertStream({ alerts, isLoading }: { alerts: any[]; isLoading: boolean }) {
  const qc = useQueryClient()

  const ackMutation = useMutation({
    mutationFn: (id: number) => nocApi.ackAlert(id),
    onSuccess: (res, id) => {
      toast.success(`Alert #${id} acknowledged`)
      qc.invalidateQueries({ queryKey: ['noc-alerts'] })
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to acknowledge alert'))
    },
  })

  const unackedAlerts = alerts.filter((a) => a.status !== 'ACKNOWLEDGED')
  const displayAlerts = unackedAlerts.slice(0, 10)

  return (
    <Panel
      title="Live Alarm & Fault Stream"
      description="Active alerts and incident signals across router fleet"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/noc/alerts"
            className="text-[11.5px] font-medium text-primary hover:underline flex items-center gap-0.5"
          >
            All Alarms <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      }
      bodyClassName="p-0"
    >
      {isLoading ? (
        <div className="p-6 text-center text-xs text-slate-500">Loading alert stream...</div>
      ) : displayAlerts.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center">
          <CircleCheck className="w-8 h-8 text-healthy mb-2 opacity-80" />
          <p className="font-medium text-slate-900">No active unacknowledged alerts</p>
          <p className="text-[11px] text-slate-500 mt-0.5">All router alarm thresholds operating nominally.</p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline h-[240px] overflow-y-auto">
          {displayAlerts.map((alert) => {
            const sev = mapSeverity(alert.severity)
            return (
              <li
                key={alert.id}
                className="group flex items-start gap-3 px-4 py-2.5 transition-colors duration-100 hover:bg-accent/40"
              >
                <StatusDot status={sev} pulse={sev === 'critical'} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10.5px] text-slate-500">#{alert.id}</span>
                    <span className="truncate text-[12.5px] font-medium text-slate-900">{alert.title}</span>
                    {alert.instance_id && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                        Inst #{alert.instance_id}
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 line-clamp-1">
                    {alert.message}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[10.5px] text-slate-500">
                    <span className="font-mono">{alert.source || 'VyOS'}</span>
                    <span>{formatAge(alert.created_at)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 opacity-90 transition-opacity">
                  <button
                    onClick={() => ackMutation.mutate(alert.id)}
                    disabled={ackMutation.isPending}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium transition-colors hover:bg-accent"
                  >
                    Ack
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

// ── Live Loki Log Stream Explorer ───────────────────────────────────────────

function LiveLogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('{job="captive-portal"}')
  const [isLive, setIsLive] = useState(false)

  const fetchLogs = async (q: string = query, isPoll: boolean = false) => {
    if (!isPoll) setLoading(true)
    try {
      const res = await api.get('/noc/logs/', { params: { query: q, limit: 30 } })
      const results = res.data?.data?.result || []
      const parsedLogs: LogEntry[] = []

      results.forEach((stream: any) => {
        stream.values?.forEach((val: [string, string]) => {
          parsedLogs.push({
            timestamp: new Date(Number(val[0]) / 1000000).toISOString(),
            message: val[1],
            level: guessLogLevel(val[1]),
          })
        })
      })

      parsedLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      setLogs(parsedLogs)
    } catch {
      // Ignore poll error
    } finally {
      if (!isPoll) setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(query)
  }, [])

  useEffect(() => {
    let interval: any
    if (isLive) {
      interval = setInterval(() => {
        fetchLogs(query, true)
      }, 4000)
    }
    return () => clearInterval(interval)
  }, [isLive, query])

  return (
    <Panel
      title="Syslog & Application Stream"
      description="Live log tailing via Grafana Loki proxy"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 border transition-colors',
              isLive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-slate-100 text-slate-500 border-slate-200'
            )}
          >
            {isLive ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
            {isLive ? 'Live Tailing' : 'Paused'}
          </button>
          <Link
            to="/noc/analytics"
            className="text-[11.5px] font-medium text-primary hover:underline flex items-center gap-0.5"
          >
            Full Explorer <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      }
      bodyClassName="p-0"
    >
      <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2 text-xs">
        <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <select
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            fetchLogs(e.target.value)
          }}
          className="bg-transparent font-mono text-[11px] text-slate-900 focus:outline-none cursor-pointer flex-1"
        >
          <option value='{job="captive-portal"}'>Job: captive-portal</option>
          <option value='{job="captive-portal"} |= "ERROR"'>Job: captive-portal (Errors Only)</option>
          <option value='{job="bsnl-backend"}'>Job: bsnl-backend</option>
          <option value='{job="nginx"}'>Job: nginx</option>
        </select>
        <button
          onClick={() => fetchLogs(query)}
          className="text-slate-500 hover:text-slate-900 p-1"
          title="Refresh logs"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="h-[200px] overflow-y-auto p-3 font-mono text-[11px] bg-slate-950 text-slate-200 space-y-1">
        {loading && logs.length === 0 ? (
          <div className="text-slate-500 py-4 text-center">Fetching syslog stream...</div>
        ) : logs.length === 0 ? (
          <div className="text-slate-500 py-4 text-center">No logs received for current stream query.</div>
        ) : (
          logs.slice(0, 15).map((log, idx) => (
            <div key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-500 text-[10px] shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span
                className={cn(
                  'text-[9.5px] px-1 py-0.2 rounded font-bold uppercase shrink-0',
                  log.level === 'ERROR' || log.level === 'FATAL'
                    ? 'bg-rose-500/20 text-rose-400'
                    : log.level === 'WARN'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-400'
                )}
              >
                {log.level || 'INFO'}
              </span>
              <span className="text-slate-300 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </Panel>
  )
}

// ── Live Router Probes Table ────────────────────────────────────────────────

function LiveInstancesTable({ instances, loading }: { instances: InstanceRead[]; loading: boolean }) {
  if (loading) return <PageLoader />
  if (!instances?.length) {
    return (
      <Card>
        <CardBody className="text-sm text-slate-500 p-6 text-center">
          No router instances configured.
        </CardBody>
      </Card>
    )
  }

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

  const isOnline = health?.ssh_connected ?? (health?.status === 'ok' || health?.status === 'online')

  return (
    <Card
      className={cn(
        'border-l-4 transition-all shadow-2xs',
        isOnline ? 'border-l-healthy' : isError ? 'border-l-critical' : 'border-l-warn'
      )}
    >
      <CardBody className="p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <StatusDot status={isOnline ? 'healthy' : isError ? 'critical' : 'warn'} />
            {instance.name || `Router #${instance.id}`}
          </span>
          <span
            className={cn(
              'text-[10.5px] font-mono px-2 py-0.5 rounded-md font-semibold',
              isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            )}
          >
            {isLoading ? 'Checking...' : isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className="text-[11.5px] text-slate-500 space-y-1 font-mono">
          <div>Host IP: <span className="text-slate-900">{instance.network?.vyos_ip || instance.host || '—'}</span></div>
          {health?.latency_ms != null && (
            <div>Latency: <span className="text-slate-900 font-semibold">{health.latency_ms}ms</span></div>
          )}
          {instance.network?.wan_interface && (
            <div>WAN Intf: <span className="text-slate-900">{instance.network.wan_interface}</span></div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

// ── Main Page Component ─────────────────────────────────────────────────────

export function NOCOperationsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [selectedCustomerForDeboard, setSelectedCustomerForDeboard] = useState<CustomerRead | null>(null)

  // Search & Filter state for provisioned tenants
  const [searchTenant, setSearchTenant] = useState('')
  const [instanceFilter, setInstanceFilter] = useState<string>('ALL')

  // Topology inspection modal state
  const [isTopologyModalOpen, setIsTopologyModalOpen] = useState(false)
  const [selectedTopologyInstanceId, setSelectedTopologyInstanceId] = useState<number | null>(null)

  // 1. Fetch Instances
  const { data: instances = [], isLoading: loadingInstances } = useQuery({
    queryKey: ['noc-instances'],
    queryFn: () => nocApi.listInstances(),
  })

  // 2. Fetch Customers
  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers', 'noc'],
    queryFn: () => customersApi.list({ limit: 200 }),
  })

  // 3. Fetch Alerts
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['noc-alerts'],
    queryFn: () => nocApi.listAlerts(),
    refetchInterval: 15_000,
  })

  // Multi-instance health runner
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
        return !val || val.ssh_connected === false || (val.status !== 'ok' && val.status !== 'online' && val.status !== 'reachable')
      })

      if (failed.length === 0) {
        toast.success(`Health check passed across all ${targetInstances.length} router instances`)
      } else {
        toast.error(`Health check warning: ${failed.length} of ${targetInstances.length} instance(s) failed or offline`)
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to run health check'))
    },
  })

  // Tenant deboard action
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
  const ready     = customers.filter((c) => c.status === 'READY' || c.status === 'NETWORK_CONFIGURED')
  const pushed    = customers.filter((c) => c.status === 'PUSHED' || c.status === 'ACTIVE')

  const filteredPushed = useMemo(() => {
    return pushed.filter((c) => {
      if (instanceFilter !== 'ALL') {
        const instId = Number(instanceFilter)
        if (c.captive_instance_id !== instId) return false
      }
      if (!searchTenant) return true
      const q = searchTenant.toLowerCase()
      return (
        c.company_name.toLowerCase().includes(q) ||
        (c.captive_customer_slug && c.captive_customer_slug.toLowerCase().includes(q)) ||
        (c.subnet_cidr && c.subnet_cidr.toLowerCase().includes(q)) ||
        (c.user_account && c.user_account.toLowerCase().includes(q)) ||
        (c.gateway_ip && c.gateway_ip.toLowerCase().includes(q))
      )
    })
  }, [pushed, instanceFilter, searchTenant])

  const unackedAlerts = alerts.filter((a) => a.status !== 'ACKNOWLEDGED')
  const criticalAlerts = unackedAlerts.filter((a) => mapSeverity(a.severity) === 'critical')
  const onlineInstances = instances.filter((i) => i.is_active !== false)

  const isLoading = loadingInstances || loadingCustomers

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="NOC Real-Time Operations"
        subtitle="Live router health probes, alarm streams, syslog explorer & active tenant session management"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/noc/sessions">
              <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                <Wifi className="w-3.5 h-3.5 text-primary" />
                Active Sessions
              </Button>
            </Link>
            <Link to="/noc/alerts">
              <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                <Siren className="w-3.5 h-3.5 text-rose-500" />
                Fault Alarms
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* Live Network Status Banner */}
        <LiveVerdict
          onlineCount={onlineInstances.length}
          totalInstances={instances.length}
          unackedCount={unackedAlerts.length}
          criticalCount={criticalAlerts.length}
          readyCount={ready.length}
          isHealthChecking={runHealthCheckMutation.isPending}
          onRunHealthCheck={() => runHealthCheckMutation.mutate()}
        />

        {/* Real Data KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              Active Routers
              <Server className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold mt-1 text-slate-900">
              {onlineInstances.length} <span className="text-xs font-normal text-slate-500">/ {instances.length}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Live VyOS fleet</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              Live Tenants
              <Users className="w-3.5 h-3.5 text-healthy" />
            </div>
            <div className="text-2xl font-bold mt-1 text-healthy">{pushed.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Provisioned on routers</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              Active Alarms
              <Siren className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className={cn('text-2xl font-bold mt-1', unackedAlerts.length > 0 ? 'text-warn' : 'text-slate-900')}>
              {unackedAlerts.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Unacknowledged alerts</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              Critical Faults
              <ShieldAlert className="w-3.5 h-3.5 text-critical" />
            </div>
            <div className={cn('text-2xl font-bold mt-1', criticalAlerts.length > 0 ? 'text-critical animate-pulse' : 'text-slate-900')}>
              {criticalAlerts.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Requiring immediate triage</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              Staging Queue
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold mt-1 text-slate-900">{ready.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting onboarding</div>
          </div>
        </div>

        {/* Real-Time Live Streams: Alerts & Syslog */}
        <div className="grid gap-4 xl:grid-cols-2">
          <LiveAlertStream alerts={alerts} isLoading={loadingAlerts} />
          <LiveLogStream />
        </div>

        {/* Live Router Infrastructure Probes */}
        <Panel
          title="Live Router Infrastructure Probes"
          description="Real-time VyOS health probes & connectivity status"
          bodyClassName="p-4"
        >
          <LiveInstancesTable instances={instances} loading={loadingInstances} />
        </Panel>

        {/* Telemetry Placeholder Cards (Cleanly decoupled from mock data) */}
        <div className="grid gap-4 xl:grid-cols-2">
          <TelemetryPendingCard
            title="Traffic Aggregate (NetFlow / sFlow)"
            description="Fleet-wide aggregate throughput & interface utilization"
            message="Requires NetFlow/Prometheus ingestion collector."
            collector="NetFlow / sFlow daemon on VyOS edge routers"
            icon={Activity}
          />
          <TelemetryPendingCard
            title="Instance Load & Thermal Heatmap"
            description="CPU load, interface queue congestion & hardware metrics"
            message="Requires Prometheus node_exporter telemetry collector."
            collector="node_exporter / VyOS SNMP polling agent"
            icon={Cpu}
          />
        </div>

        {/* Provisioned Tenants & Operational Session Controls */}
        <Panel
          title={
            <div className="flex items-center gap-2.5">
              <span>Provisioned Tenants & Operational Session Controls</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {pushed.length} Live Tenants
              </span>
            </div>
          }
          description="Manage active tenants across the router fleet, inspect VLAN & IP topology, and access session diagnostics"
          actions={
            <div className="flex items-center gap-3">
              <Link
                to="/noc/provisioning"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Provisioning Queue ({ready.length}) <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                to="/noc/sessions"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Open All Sessions <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          }
          bodyClassName="p-4 space-y-4"
        >
          {/* Search & Filter Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tenant, slug, subnet..."
                value={searchTenant}
                onChange={(e) => setSearchTenant(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-[11px] font-medium text-slate-500">Router Filter:</span>
              <select
                value={instanceFilter}
                onChange={(e) => setInstanceFilter(e.target.value)}
                className="text-xs bg-white rounded-lg border border-slate-200 py-1.5 px-2.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Routers ({pushed.length})</option>
                {instances.map((inst) => {
                  const instId = inst.instance_id || inst.id
                  const count = pushed.filter((c) => c.captive_instance_id === instId).length
                  return (
                    <option key={inst.id} value={String(instId)}>
                      {inst.name || `Router #${inst.id}`} ({count})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12"><PageLoader /></div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Tenant / Company</Th>
                  <Th>Status</Th>
                  <Th>Router Gateway & Interface</Th>
                  <Th>CVLAN & Subnet</Th>
                  <Th>Bandwidth Limit</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredPushed.length === 0 ? (
                  <EmptyRow
                    cols={6}
                    message={
                      searchTenant || instanceFilter !== 'ALL'
                        ? 'No provisioned tenants match your search filter.'
                        : 'No provisioned tenants active on the fleet yet.'
                    }
                  />
                ) : (
                  filteredPushed.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <Td className="font-semibold text-slate-900 text-xs">
                        <Link to={`/customers/${c.id}`} className="hover:text-blue-600 hover:underline">
                          {c.company_name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 font-normal text-[11px] text-slate-500">
                          <span className="font-mono">ID #{c.id}</span>
                          {c.captive_customer_slug && (
                            <>
                              <span>•</span>
                              <code className="text-[10.5px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {c.captive_customer_slug}
                              </code>
                            </>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <StatusBadge status={c.status} />
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-800">
                            {c.captive_instance_id ? `Router #${c.captive_instance_id}` : '—'}
                          </span>
                          {c.captive_instance_id && (
                            <button
                              onClick={() => {
                                setSelectedTopologyInstanceId(c.captive_instance_id)
                                setIsTopologyModalOpen(true)
                              }}
                              className="text-[10.5px] text-blue-600 hover:text-blue-800 underline font-medium"
                              title="View Router Topology"
                            >
                              (Topology)
                            </button>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          {c.qinq_interface ? `${c.qinq_interface}.${c.svlan || 100}.${c.cvlan || '—'}` : '—'}
                        </div>
                      </Td>
                      <Td>
                        <div className="font-mono text-xs font-semibold text-slate-900">
                          {c.subnet_cidr || '—'}
                        </div>
                        <div className="font-mono text-[10.5px] text-slate-500 mt-0.5">
                          CVLAN: <strong className="text-teal-700 font-bold">{c.cvlan ?? '—'}</strong>
                          {c.gateway_ip && ` • GW: ${c.gateway_ip}`}
                        </div>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs text-slate-700">
                          {c.max_bandwidth || '50mbit'}
                        </span>
                        <div className="text-[10.5px] text-slate-400 capitalize">
                          {c.qos_mode || 'per_user'}
                        </div>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Link to={`/noc/customers/${c.id}/sessions`}>
                            <Button
                              variant="secondary"
                              size="xs"
                              className="h-7 text-[11px] gap-1 text-slate-700 hover:text-blue-700"
                            >
                              <Wifi className="h-3 w-3 text-blue-600" />
                              Diagnostics
                            </Button>
                          </Link>
                          {c.captive_instance_id && (
                            <Button
                              variant="secondary"
                              size="xs"
                              className="h-7 text-[11px] gap-1 text-slate-700 hover:text-indigo-700"
                              onClick={() => {
                                setSelectedTopologyInstanceId(c.captive_instance_id)
                                setIsTopologyModalOpen(true)
                              }}
                            >
                              <Network className="h-3 w-3 text-indigo-600" />
                              Topology
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="xs"
                            className="h-7 text-[11px] gap-1"
                            onClick={() => setSelectedCustomerForDeboard(c)}
                          >
                            Deboard
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>

      {/* Deboard Confirm Dialog */}
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

      {/* Router Topology Modal Inspector */}
      <RouterTopologyModal
        instanceId={selectedTopologyInstanceId}
        isOpen={isTopologyModalOpen}
        onClose={() => {
          setIsTopologyModalOpen(false)
          setSelectedTopologyInstanceId(null)
        }}
      />
    </div>
  )
}

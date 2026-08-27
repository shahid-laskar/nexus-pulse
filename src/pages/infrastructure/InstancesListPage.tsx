import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Server,
  Activity,
  Network,
  Shield,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  Key,
  X,
  Radio,
  ExternalLink,
  Layers,
  Database,
  Cpu,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { nocApi } from '@/api/noc'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/store/auth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import type { InstanceRead, HealthResponse } from '@/types'

export function InstancesListPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN', 'BA_NOC_ADMIN'])
  const { user, isSuper } = useAuthStore()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedInstance, setSelectedInstance] = useState<InstanceRead | null>(null)
  const [healthMap, setHealthMap] = useState<Record<number, { data?: HealthResponse; loading: boolean; error?: string }>>({})

  // Fetch Instances
  const {
    data: instances = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<InstanceRead[]>({
    queryKey: ['noc-instances'],
    queryFn: nocApi.listInstances,
  })

  // Run single health check
  const checkHealthMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      setHealthMap((prev) => ({
        ...prev,
        [instanceId]: { loading: true },
      }))
      const res = await nocApi.health(instanceId)
      return { instanceId, res }
    },
    onSuccess: ({ instanceId, res }) => {
      setHealthMap((prev) => ({
        ...prev,
        [instanceId]: { loading: false, data: res },
      }))
      toast.success(`Instance #${instanceId} is ${res.status.toUpperCase()}`)
    },
    onError: (err, instanceId) => {
      const msg = extractErrorMessage(err)
      setHealthMap((prev) => ({
        ...prev,
        [instanceId]: { loading: false, error: msg || 'Health check failed' },
      }))
      toast.error(`Health check failed for #${instanceId}: ${msg}`)
    },
  })

  // Run bulk health checks for all instances in view
  const runBulkHealthCheck = async () => {
    const ids = instances.map((i) => i.instance_id || i.id).filter(Boolean) as number[]
    if (ids.length === 0) return

    toast.loading('Checking health of all accessible instances...', { id: 'bulk-health' })
    for (const id of ids) {
      try {
        setHealthMap((prev) => ({ ...prev, [id]: { loading: true } }))
        const res = await nocApi.health(id)
        setHealthMap((prev) => ({ ...prev, [id]: { loading: false, data: res } }))
      } catch (err: any) {
        setHealthMap((prev) => ({
          ...prev,
          [id]: { loading: false, error: err.message || 'Offline' },
        }))
      }
    }
    toast.success('Completed instance health diagnostics', { id: 'bulk-health' })
  }

  // Filtered instances
  const filteredInstances = useMemo(() => {
    return instances.filter((inst) => {
      const idStr = String(inst.instance_id || inst.id || '')
      const name = (inst.name || '').toLowerCase()
      const identifier = (inst.identifier || '').toLowerCase()
      const ip = (inst.network?.vyos_ip || inst.host || '').toLowerCase()
      const ba = (inst.location?.ba || '').toLowerCase()
      const circle = (inst.location?.circle || '').toLowerCase()
      const query = searchTerm.toLowerCase().trim()

      const matchesSearch =
        !query ||
        idStr.includes(query) ||
        name.includes(query) ||
        identifier.includes(query) ||
        ip.includes(query) ||
        ba.includes(query) ||
        circle.includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && inst.is_active !== false) ||
        (statusFilter === 'inactive' && inst.is_active === false)

      return matchesSearch && matchesStatus
    })
  }, [instances, searchTerm, statusFilter])

  // KPIs
  const totalCount = instances.length
  const activeCount = instances.filter((i) => i.is_active !== false).length
  const totalBAs = useMemo(() => {
    const bas = new Set<string>()
    instances.forEach((i) => {
      if (i.location?.ba) bas.add(i.location.ba)
    })
    return bas.size
  }, [instances])

  if (isLoading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      <PageHeader
        title="VyOS Instances Inspector"
        description="Real-time telemetry, geographic scope, network topology, and health status of deployed edge routers"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={runBulkHealthCheck}
              className="gap-1.5"
            >
              <Activity className="h-4 w-4 text-primary" /> Run All Diagnostics
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Scoped Instances</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Server className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-healthy">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Routers</p>
              <p className="text-2xl font-bold text-healthy mt-1">{activeCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-healthy/10 text-healthy">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-accent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Business Areas Covered</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalBAs}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-warning">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Administrative Role</p>
              <p className="text-sm font-bold text-foreground mt-1 truncate">
                {user?.profile?.role?.name.replace(/_/g, ' ') || 'NOC Operator'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-warning/10 text-warning">
              <Shield className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search instance, IP, identifier, BA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex rounded-lg border border-hairline bg-surface p-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({instances.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'active'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inactive ({totalCount - activeCount})
            </button>
          </div>
        </div>
      </div>

      {/* Instances Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>ID / Identifier</Th>
                <Th>Name & Scope</Th>
                <Th>Network & Topology</Th>
                <Th>VLAN Allocation</Th>
                <Th>WAN Bandwidth</Th>
                <Th>Live Health</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredInstances.length === 0 ? (
                <EmptyRow cols={7} message="No VyOS instances match the selected criteria." />
              ) : (
                filteredInstances.map((inst) => {
                  const instId = inst.instance_id || inst.id || 0
                  const healthInfo = healthMap[instId]
                  const vyosIp = inst.network?.vyos_ip || inst.host || '—'
                  const mgmtIp = inst.network?.vyos_management_ip
                  const circle = inst.location?.circle || '—'
                  const ba = inst.location?.ba || '—'
                  const svlan = inst.network?.svlan
                  const cvlanStart = inst.network?.cvlan_start
                  const cvlanEnd = inst.network?.cvlan_end

                  return (
                    <tr key={instId} className="hover:bg-surface-2/40 transition-colors">
                      <Td>
                        <div className="font-mono text-xs font-semibold text-foreground">
                          #{instId}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px]">
                          {inst.identifier || '—'}
                        </div>
                      </Td>

                      <Td>
                        <div className="text-xs font-semibold text-foreground">{inst.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                            {circle}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-foreground border border-hairline">
                            {ba}
                          </span>
                        </div>
                      </Td>

                      <Td>
                        <div className="text-xs font-mono text-foreground flex items-center gap-1">
                          <Radio className="h-3 w-3 text-primary" /> {vyosIp}
                        </div>
                        {mgmtIp && (
                          <div className="text-[11px] font-mono text-muted-foreground">
                            Mgmt: {mgmtIp}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground">
                          WAN: {inst.network?.wan_interface || 'eth0'}
                        </div>
                      </Td>

                      <Td>
                        {svlan ? (
                          <div>
                            <div className="text-xs font-medium text-foreground">SVLAN {svlan}</div>
                            {cvlanStart && cvlanEnd && (
                              <div className="text-[11px] font-mono text-muted-foreground">
                                CVLAN {cvlanStart}–{cvlanEnd}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </Td>

                      <Td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-2 border border-hairline font-mono text-foreground">
                          {inst.network?.wan_max_bandwidth || '1gbit'}
                        </span>
                      </Td>

                      <Td>
                        {healthInfo?.loading ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground animate-pulse">
                            <Activity className="h-3 w-3 animate-spin text-primary" /> Pinging...
                          </span>
                        ) : healthInfo?.data ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                healthInfo.data.status === 'healthy' || healthInfo.data.status === 'ok'
                                  ? 'bg-healthy'
                                  : 'bg-danger'
                              }`}
                            />
                            <span className="text-xs font-medium uppercase text-foreground">
                              {healthInfo.data.status}
                            </span>
                            {healthInfo.data.latency_ms !== undefined && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({healthInfo.data.latency_ms}ms)
                              </span>
                            )}
                          </div>
                        ) : healthInfo?.error ? (
                          <span className="inline-flex items-center gap-1 text-xs text-danger font-medium">
                            <XCircle className="h-3.5 w-3.5" /> Offline
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => checkHealthMutation.mutate(instId)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Activity className="h-3 w-3" /> Check Health
                          </button>
                        )}
                      </Td>

                      <Td className="text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedInstance(inst)}
                          className="gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> Inspect
                        </Button>
                      </Td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* ── Slide-over / Modal Inspector ────────────────────────────────── */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end transition-opacity">
          <div className="w-full max-w-xl bg-surface h-full shadow-2xl flex flex-col border-l border-hairline animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-hairline flex items-center justify-between bg-surface-2/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {selectedInstance.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Instance #{selectedInstance.instance_id || selectedInstance.id} ·{' '}
                    {selectedInstance.identifier}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInstance(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Actions & Live Status */}
              <div className="bg-surface-2/50 border border-hairline rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-healthy animate-pulse" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      {selectedInstance.is_active !== false ? 'Active Control-Plane Registry' : 'Disabled Instance'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      DB Alias: {selectedInstance.db_alias || 'default'}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    checkHealthMutation.mutate(
                      (selectedInstance.instance_id || selectedInstance.id)!
                    )
                  }
                  disabled={checkHealthMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  <Activity className="h-3.5 w-3.5 text-primary" /> Test Connectivity
                </Button>
              </div>

              {/* Section 1: Geographic Scope & Identity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" /> Scope & Metadata
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface-2/30 p-3.5 rounded-xl border border-hairline">
                  <div>
                    <span className="text-muted-foreground">Circle:</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {selectedInstance.location?.circle || 'Global / Unassigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Business Area:</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {selectedInstance.location?.ba || 'Global / Unassigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created At:</span>
                    <p className="font-mono text-muted-foreground mt-0.5">
                      {selectedInstance.created_at
                        ? new Date(selectedInstance.created_at).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Database State:</span>
                    <p className="font-mono text-healthy mt-0.5 flex items-center gap-1">
                      <Database className="h-3.5 w-3.5" /> Ready (Global)
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Network Topology */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Network className="h-4 w-4 text-primary" /> Network Topology
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface-2/30 p-3.5 rounded-xl border border-hairline">
                  <div>
                    <span className="text-muted-foreground">VyOS Router IP:</span>
                    <p className="font-mono font-semibold text-foreground mt-0.5">
                      {selectedInstance.network?.vyos_ip || selectedInstance.host || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Management IP:</span>
                    <p className="font-mono font-semibold text-foreground mt-0.5">
                      {selectedInstance.network?.vyos_management_ip || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">WAN Interface:</span>
                    <p className="font-mono text-foreground mt-0.5">
                      {selectedInstance.network?.wan_interface || 'eth0'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">WAN Max Bandwidth:</span>
                    <p className="font-mono text-foreground mt-0.5">
                      {selectedInstance.network?.wan_max_bandwidth || '1gbit'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dedicated SVLAN:</span>
                    <p className="font-semibold text-primary mt-0.5">
                      {selectedInstance.network?.svlan || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CVLAN Allocation Range:</span>
                    <p className="font-mono text-foreground mt-0.5">
                      {selectedInstance.network?.cvlan_start && selectedInstance.network?.cvlan_end
                        ? `${selectedInstance.network.cvlan_start} – ${selectedInstance.network.cvlan_end}`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Authentication & Security */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" /> Authentication & Secrets
                </h4>
                <div className="space-y-2 text-xs bg-surface-2/30 p-3.5 rounded-xl border border-hairline">
                  <div className="flex justify-between items-center py-1 border-b border-hairline/60">
                    <span className="text-muted-foreground">NAS Identifier</span>
                    <span className="font-mono font-medium text-foreground">
                      {selectedInstance.auth?.nas_identifier || selectedInstance.identifier || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-hairline/60">
                    <span className="text-muted-foreground">API Endpoint</span>
                    <span className="font-mono text-foreground truncate max-w-[280px]">
                      {selectedInstance.auth?.api_endpoint || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-hairline/60">
                    <span className="text-muted-foreground">SSH Credentials</span>
                    <span className="font-mono text-foreground">
                      {selectedInstance.auth?.ssh_username || 'vyos'}:
                      {selectedInstance.auth?.ssh_port || 22}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-hairline/60">
                    <span className="text-muted-foreground">API Key</span>
                    <span className="font-mono text-xs">
                      {selectedInstance.auth?.api_key || (selectedInstance.auth?.has_api_key ? 'Configured (Protected)' : 'Not Configured')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">RADIUS Shared Secret</span>
                    <span className="font-mono text-xs">
                      {selectedInstance.auth?.radius_secret || (selectedInstance.auth?.has_radius_secret ? 'Configured (Protected)' : 'Not Configured')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Notes */}
              {selectedInstance.notes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Operational Notes
                  </h4>
                  <div className="text-xs bg-surface-2/30 p-3 rounded-lg border border-hairline text-foreground whitespace-pre-wrap">
                    {selectedInstance.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-hairline bg-surface-2/20 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedInstance(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

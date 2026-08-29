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
import { RouterTopologyModal } from '@/components/noc/RouterTopologyModal'
import type { InstanceRead, HealthResponse } from '@/types'

export function InstancesListPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN', 'BA_NOC_ADMIN'])
  const { user, isSuper } = useAuthStore()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedInstance, setSelectedInstance] = useState<InstanceRead | null>(null)
  const [topologyModalInstanceId, setTopologyModalInstanceId] = useState<number | null>(null)
  const [healthMap, setHealthMap] = useState<
    Record<number, { data?: HealthResponse; loading: boolean; error?: string; checkedAt?: Date }>
  >({})

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
        [instanceId]: { loading: true, data: prev[instanceId]?.data, error: undefined },
      }))
      const res = await nocApi.health(instanceId)
      return { instanceId, res }
    },
    onSuccess: ({ instanceId, res }) => {
      setHealthMap((prev) => ({
        ...prev,
        [instanceId]: { loading: false, data: res, error: undefined, checkedAt: new Date() },
      }))
      toast.success(`Instance #${instanceId} is ${res.status.toUpperCase()}`)
    },
    onError: (err, instanceId) => {
      const msg = extractErrorMessage(err)
      setHealthMap((prev) => ({
        ...prev,
        [instanceId]: { loading: false, error: msg || 'Health check failed', checkedAt: new Date() },
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
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="VyOS Instances Inspector"
        subtitle="Real-time telemetry, geographic scope, network topology, and health status of deployed edge routers"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={runBulkHealthCheck}
              className="gap-1.5 h-8 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
            >
              <Activity className="h-3.5 w-3.5 text-blue-600" /> Run All Diagnostics
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Scoped Fleet</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Assigned router instances</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Server className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Edge</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-0.5">{activeCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Online &amp; routing traffic</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Business Areas</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{totalBAs}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Regional BA locations</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Scope Level</p>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">{user?.profile.role.name || 'Admin'}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Role jurisdiction</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Instances' },
              { id: 'active', label: 'Active Only' },
              { id: 'inactive', label: 'Inactive' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Instances Table */}
        <Card className="border-slate-200 shadow-2xs">
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
                    <tr key={instId} className="hover:bg-slate-50 transition-colors">
                      <Td>
                        <div className="font-mono text-xs font-semibold text-slate-900">
                          #{instId}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate max-w-[140px]">
                          {inst.identifier || '—'}
                        </div>
                      </Td>

                      <Td>
                        <div className="text-xs font-semibold text-slate-900">{inst.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                            {circle}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-900 border border-slate-200">
                            {ba}
                          </span>
                        </div>
                      </Td>

                      <Td>
                        <div className="text-xs font-mono text-slate-900 flex items-center gap-1">
                          <Radio className="h-3 w-3 text-primary" /> {vyosIp}
                        </div>
                        {mgmtIp && (
                          <div className="text-[11px] font-mono text-slate-500">
                            Mgmt: {mgmtIp}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500">
                          WAN: {inst.network?.wan_interface || 'eth0'}
                        </div>
                      </Td>

                      <Td>
                        {svlan ? (
                          <div>
                            <div className="text-xs font-medium text-slate-900">SVLAN {svlan}</div>
                            {cvlanStart && cvlanEnd && (
                              <div className="text-[11px] font-mono text-slate-500">
                                CVLAN {cvlanStart}–{cvlanEnd}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </Td>

                      <Td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 font-mono text-slate-900">
                          {inst.network?.wan_max_bandwidth || '1gbit'}
                        </span>
                      </Td>

                      <Td>
                        {healthInfo?.loading ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 animate-pulse">
                            <Activity className="h-3 w-3 animate-spin text-primary" /> Pinging...
                          </span>
                        ) : healthInfo?.data ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                healthInfo.data.status === 'healthy' || healthInfo.data.status === 'ok'
                                  ? 'bg-emerald-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span className="text-xs font-medium uppercase text-slate-900">
                              {healthInfo.data.status}
                            </span>
                            {healthInfo.data.latency_ms !== undefined && (
                              <span className="text-[10px] text-slate-500 font-mono">
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setTopologyModalInstanceId(inst.instance_id || inst.id)}
                            className="gap-1 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <Layers className="h-3.5 w-3.5 text-blue-600" /> Topology
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedInstance(inst)}
                            className="gap-1 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" /> Inspect
                          </Button>
                        </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedInstance.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Instance #{selectedInstance.instance_id || selectedInstance.id} ·{' '}
                    {selectedInstance.identifier}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInstance(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Live Health & Telemetry Card */}
              {(() => {
                const activeInstId = (selectedInstance.instance_id || selectedInstance.id)!
                const activeHealth = healthMap[activeInstId]
                const isHealthy = activeHealth?.data?.status === 'healthy' || activeHealth?.data?.status === 'ok'
                const isDegraded = activeHealth?.data?.status === 'degraded' || activeHealth?.data?.status === 'warning'
                const isDown = Boolean(activeHealth?.error) || (Boolean(activeHealth?.data) && !isHealthy && !isDegraded)

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {activeHealth?.loading ? (
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          </span>
                        ) : isHealthy ? (
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          </span>
                        ) : isDegraded ? (
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          </span>
                        ) : isDown ? (
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600 shrink-0">
                            <XCircle className="h-5 w-5 text-rose-600" />
                          </span>
                        ) : (
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-200 text-slate-600 shrink-0">
                            <Activity className="h-4 w-4" />
                          </span>
                        )}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                              {activeHealth?.loading
                                ? 'Running Health Diagnostics...'
                                : activeHealth?.data
                                ? `Status: ${activeHealth.data.status.toUpperCase()}`
                                : activeHealth?.error
                                ? 'Offline / Unreachable'
                                : 'Live Health Diagnostics'}
                            </h4>
                            {activeHealth?.loading && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 animate-pulse">
                                Testing
                              </span>
                            )}
                            {!activeHealth?.loading && isHealthy && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                Healthy
                              </span>
                            )}
                            {!activeHealth?.loading && isDegraded && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                                Degraded
                              </span>
                            )}
                            {!activeHealth?.loading && isDown && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
                                Offline
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {activeHealth?.checkedAt
                              ? `Last checked at ${activeHealth.checkedAt.toLocaleTimeString()}`
                              : 'Probe ping latency, SSH port & API reachability'}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={activeHealth?.data || activeHealth?.error ? 'secondary' : 'primary'}
                        onClick={() => checkHealthMutation.mutate(activeInstId)}
                        disabled={activeHealth?.loading}
                        className="gap-1.5 text-xs shrink-0 self-start sm:self-auto"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${activeHealth?.loading ? 'animate-spin' : ''}`} />
                        {activeHealth?.loading
                          ? 'Checking...'
                          : activeHealth?.data || activeHealth?.error
                          ? 'Re-test Health'
                          : 'Test Connectivity'}
                      </Button>
                    </div>

                    {/* Metrics Breakdown */}
                    <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/80">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Ping Latency
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">
                          {activeHealth?.loading ? (
                            <span className="text-slate-400 animate-pulse">...</span>
                          ) : activeHealth?.data?.latency_ms !== undefined ? (
                            `${activeHealth.data.latency_ms} ms`
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          SSH Reachable
                        </span>
                        <span className="text-xs font-bold mt-0.5 block">
                          {activeHealth?.loading ? (
                            <span className="text-slate-400 animate-pulse">...</span>
                          ) : activeHealth?.data?.ssh_connected ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Yes
                            </span>
                          ) : activeHealth?.data?.ssh_connected === false || activeHealth?.error ? (
                            <span className="text-rose-600 flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> No
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          WAN Interface
                        </span>
                        <span className="text-xs font-mono text-slate-900 mt-0.5 block truncate">
                          {activeHealth?.data?.wan_interface || selectedInstance.network?.wan_interface || 'eth0'}
                        </span>
                      </div>
                    </div>

                    {/* Diagnostics feedback message if present */}
                    {(activeHealth?.data?.message || activeHealth?.error) && (
                      <div
                        className={`p-3 rounded-xl border text-xs ${
                          isHealthy
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : isDegraded
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isHealthy ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                          ) : isDegraded ? (
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                          )}
                          <div>
                            <span className="font-semibold block">Diagnostics Output:</span>
                            <span className="whitespace-pre-wrap font-mono text-[11px]">
                              {activeHealth?.data?.message || activeHealth?.error}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Section 1: Geographic Scope & Identity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" /> Scope & Metadata
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500">Circle:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {selectedInstance.location?.circle || 'Global / Unassigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Business Area:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {selectedInstance.location?.ba || 'Global / Unassigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Created At:</span>
                    <p className="font-mono text-slate-500 mt-0.5">
                      {selectedInstance.created_at
                        ? new Date(selectedInstance.created_at).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Database State:</span>
                    <p className="font-mono text-emerald-600 mt-0.5 flex items-center gap-1">
                      <Database className="h-3.5 w-3.5" /> Ready (Global)
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Network Topology */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Network className="h-4 w-4 text-primary" /> Network Topology
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500">VyOS Router IP:</span>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5">
                      {selectedInstance.network?.vyos_ip || selectedInstance.host || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Management IP:</span>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5">
                      {selectedInstance.network?.vyos_management_ip || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">WAN Interface:</span>
                    <p className="font-mono text-slate-900 mt-0.5">
                      {selectedInstance.network?.wan_interface || 'eth0'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">WAN Max Bandwidth:</span>
                    <p className="font-mono text-slate-900 mt-0.5">
                      {selectedInstance.network?.wan_max_bandwidth || '1gbit'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Dedicated SVLAN:</span>
                    <p className="font-semibold text-primary mt-0.5">
                      {selectedInstance.network?.svlan || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">CVLAN Allocation Range:</span>
                    <p className="font-mono text-slate-900 mt-0.5">
                      {selectedInstance.network?.cvlan_start && selectedInstance.network?.cvlan_end
                        ? `${selectedInstance.network.cvlan_start} – ${selectedInstance.network.cvlan_end}`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Authentication & Security */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" /> Authentication & Secrets
                </h4>
                <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">NAS Identifier</span>
                    <span className="font-mono font-medium text-slate-900">
                      {selectedInstance.auth?.nas_identifier || selectedInstance.identifier || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">API Endpoint</span>
                    <span className="font-mono text-slate-900 truncate max-w-[280px]">
                      {selectedInstance.auth?.api_endpoint || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">SSH Credentials</span>
                    <span className="font-mono text-slate-900">
                      {selectedInstance.auth?.ssh_username || 'vyos'}:
                      {selectedInstance.auth?.ssh_port || 22}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">API Key</span>
                    <span className="font-mono text-xs">
                      {selectedInstance.auth?.api_key || (selectedInstance.auth?.has_api_key ? 'Configured (Protected)' : 'Not Configured')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">RADIUS Shared Secret</span>
                    <span className="font-mono text-xs">
                      {selectedInstance.auth?.radius_secret || (selectedInstance.auth?.has_radius_secret ? 'Configured (Protected)' : 'Not Configured')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Notes */}
              {selectedInstance.notes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Operational Notes
                  </h4>
                  <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-900 whitespace-pre-wrap">
                    {selectedInstance.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedInstance(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Router Topology Modal */}
      <RouterTopologyModal
        instanceId={topologyModalInstanceId}
        isOpen={Boolean(topologyModalInstanceId)}
        onClose={() => setTopologyModalInstanceId(null)}
      />

      </div>
    </div>
  )
}

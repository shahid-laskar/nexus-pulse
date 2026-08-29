import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Server,
  Users,
  GitPullRequest,
  Network,
  Sliders,
  Play,
  Clock,
  Search,
  Eye,
  RotateCcw,
  Activity,
  ArrowRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  X,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Globe,
  Cpu,
  Wifi,
  Layers,
} from 'lucide-react'

import { customersApi, circlesApi, baSvlanAllocationsApi, vlanPoolsApi, businessAreasApi } from '@/api/master-data'
import { nocApi } from '@/api/noc'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/store/auth'
import { extractErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge, ChangeRequestStatusBadge, ChangeRequestTypeBadge } from '@/components/ui/Badge'
import { Table, Th, Td } from '@/components/ui/Table'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RouterTopologyModal } from '@/components/noc/RouterTopologyModal'

import type {
  CustomerRead,
} from '@/types'

// ── Helpers ─────────────────────────────────────────────────────────────

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

export function NOCProvisioningPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const navigate = useNavigate()
  const { scopeBA, scopeCircle } = useAuthStore()
  const qc = useQueryClient()

  // ── State ─────────────────────────────────────────────────────────────
  const [customerTab, setCustomerTab] = useState<'ALL' | 'READY' | 'DRAFT' | 'ACTIVE'>('READY')
  const [customerSearch, setCustomerSearch] = useState('')
  const [changeRequestFilter, setChangeRequestFilter] = useState<'ALL' | 'PENDING' | 'IN_REVIEW' | 'NEEDS_INFO'>('PENDING')
  
  // Drawer / Inspection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [drawerTab, setDrawerTab] = useState<'network' | 'nftables' | 'tc' | 'sessions' | 'diagnostics'>('network')

  // Deboard confirmation
  const [deboardingCustomer, setDeboardingCustomer] = useState<CustomerRead | null>(null)

  // Router instance health check test state
  const [testingInstanceId, setTestingInstanceId] = useState<number | null>(null)
  const [instanceHealthMap, setInstanceHealthMap] = useState<Record<number, { status: string; checkedAt: string }>>({})

  // VLAN circle selection
  const [selectedCircleId, setSelectedCircleId] = useState<number | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────

  // 1. Instances Query
  const {
    data: instances = [],
    isLoading: loadingInstances,
    refetch: refetchInstances,
  } = useQuery({
    queryKey: ['noc-instances'],
    queryFn: () => nocApi.listInstances(),
  })

  // 2. Customers Query
  const {
    data: customerListResponse,
    isLoading: loadingCustomers,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ['customers-provisioning'],
    queryFn: () => customersApi.list({ limit: 200 }),
  })
  const customers: CustomerRead[] = useMemo(() => {
    return customerListResponse?.customers || []
  }, [customerListResponse])

  // 3. Change Requests Query
  const {
    data: changeRequests = [],
    isLoading: loadingChangeRequests,
    refetch: refetchChangeRequests,
  } = useQuery({
    queryKey: ['noc-change-requests'],
    queryFn: () => nocApi.listChangeRequests(),
  })

  // 4. Circles Query
  const { data: circles = [] } = useQuery({
    queryKey: ['circles'],
    queryFn: () => circlesApi.list(),
  })

  // 5. Business Areas Query
  const { data: businessAreas = [] } = useQuery({
    queryKey: ['business-areas'],
    queryFn: () => businessAreasApi.list(),
  })

  // Default selected circle
  const activeCircleId = selectedCircleId ?? (scopeCircle?.id || circles[0]?.id || 1)

  // 6. Circle VLAN Pools Query
  const { data: circleVlanPools = [] } = useQuery({
    queryKey: ['circle-vlan-pools', activeCircleId],
    queryFn: () => vlanPoolsApi.list(activeCircleId),
    enabled: Boolean(activeCircleId),
  })

  // 7. Selected BA for VLAN allocations
  const activeBAId = scopeBA?.id || businessAreas.find((ba) => ba.circle_id === activeCircleId)?.id

  // 8. BA SVLAN Allocations Query
  const { data: baAllocations = [] } = useQuery({
    queryKey: ['ba-svlan-allocations', activeBAId],
    queryFn: () => (activeBAId ? baSvlanAllocationsApi.list(activeBAId) : Promise.resolve([])),
    enabled: Boolean(activeBAId),
  })

  // ── Selected Customer for Drawer ──────────────────────────────────────
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null
  }, [customers, selectedCustomerId])

  // Drawer Customer Detail Queries
  const { data: nftablesData, isLoading: loadingNftables, refetch: refetchNftables } = useQuery({
    queryKey: ['customer-nftables', selectedCustomerId],
    queryFn: () => (selectedCustomerId ? nocApi.getNftablesStatus(selectedCustomerId) : Promise.resolve(null)),
    enabled: Boolean(selectedCustomerId && drawerTab === 'nftables'),
  })

  const { data: tcData, isLoading: loadingTC, refetch: refetchTC } = useQuery({
    queryKey: ['customer-tc', selectedCustomerId],
    queryFn: () => (selectedCustomerId ? nocApi.getTCStatus(selectedCustomerId) : Promise.resolve(null)),
    enabled: Boolean(selectedCustomerId && drawerTab === 'tc'),
  })

  const { data: sessionsData, isLoading: loadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['customer-sessions', selectedCustomerId],
    queryFn: () => (selectedCustomerId ? nocApi.listSessions(selectedCustomerId) : Promise.resolve(null)),
    enabled: Boolean(selectedCustomerId && drawerTab === 'sessions'),
  })

  const {
    data: faultCheckData,
    isLoading: loadingFaultCheck,
    refetch: refetchFaultCheck,
    isFetching: fetchingFaultCheck,
  } = useQuery({
    queryKey: ['customer-fault-check', selectedCustomerId],
    queryFn: () => (selectedCustomerId ? nocApi.faultCheck(selectedCustomerId) : Promise.resolve(null)),
    enabled: Boolean(selectedCustomerId && drawerTab === 'diagnostics'),
  })

  // Interface setup modal state
  const [interfaceSetupModalOpen, setInterfaceSetupModalOpen] = useState(false)
  const [interfaceSetupTargetInstanceId, setInterfaceSetupTargetInstanceId] = useState<number | null>(null)
  const [interfaceSetupForm, setInterfaceSetupForm] = useState({
    interface: 'eth0',
    svlan: 100,
    cvlan: 1001,
    ip_cidr: '10.45.1.1/24',
  })

  // Change request review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTargetReq, setReviewTargetReq] = useState<any | null>(null)
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'RETURN'>('APPROVE')
  const [reviewComments, setReviewComments] = useState('')
  const [topologyModalInstanceId, setTopologyModalInstanceId] = useState<number | null>(null)

  // ── Mutations ─────────────────────────────────────────────────────────

  const onboardMutation = useMutation({
    mutationFn: (id: number) => nocApi.onboard(id),
    onSuccess: (res) => {
      toast.success(`🎉 ${res.company_name || 'Customer'} provisioned successfully on router #${res.instance_id}!`)
      qc.invalidateQueries({ queryKey: ['customers-provisioning'] })
      if (selectedCustomerId) {
        qc.invalidateQueries({ queryKey: ['customer-fault-check', selectedCustomerId] })
        qc.invalidateQueries({ queryKey: ['customer-nftables', selectedCustomerId] })
        qc.invalidateQueries({ queryKey: ['customer-tc', selectedCustomerId] })
      }
    },
    onError: (err) => {
      toast.error(`Onboarding failed: ${extractErrorMessage(err)}`)
    },
  })

  const interfaceSetupMutation = useMutation({
    mutationFn: ({ instanceId, data }: { instanceId: number; data: any }) =>
      nocApi.setupInterface(instanceId, data),
    onSuccess: (res) => {
      toast.success(`✅ QinQ interface ${res.interface}.${res.svlan}.${res.cvlan} configured on Instance #${res.instance_id}!`)
      setInterfaceSetupModalOpen(false)
      qc.invalidateQueries({ queryKey: ['noc-instances'] })
    },
    onError: (err: any) => {
      if (err?.response?.status === 429) {
        toast.error(`⏳ ${extractErrorMessage(err)}`)
      } else {
        toast.error(`Interface setup failed: ${extractErrorMessage(err)}`)
      }
    },
  })

  const approveCRMutation = useMutation({
    mutationFn: (id: number) => nocApi.approveChangeRequest(id),
    onSuccess: () => {
      toast.success('✅ Change request approved successfully!')
      qc.invalidateQueries({ queryKey: ['noc-change-requests'] })
      setReviewModalOpen(false)
    },
    onError: (err) => toast.error(`Approval failed: ${extractErrorMessage(err)}`),
  })

  const rejectCRMutation = useMutation({
    mutationFn: ({ id, comments }: { id: number; comments: string }) =>
      nocApi.rejectChangeRequest(id, { noc_notes: comments }),
    onSuccess: () => {
      toast.success('❌ Change request rejected.')
      qc.invalidateQueries({ queryKey: ['noc-change-requests'] })
      setReviewModalOpen(false)
    },
    onError: (err) => toast.error(`Rejection failed: ${extractErrorMessage(err)}`),
  })

  const returnCRMutation = useMutation({
    mutationFn: ({ id, comments }: { id: number; comments: string }) =>
      nocApi.returnChangeRequest(id, { noc_notes: comments }),
    onSuccess: () => {
      toast.success('🔄 Change request returned for revision.')
      qc.invalidateQueries({ queryKey: ['noc-change-requests'] })
      setReviewModalOpen(false)
    },
    onError: (err) => toast.error(`Return failed: ${extractErrorMessage(err)}`),
  })

  const markReadyMutation = useMutation({
    mutationFn: (id: number) => customersApi.markReady(id),
    onSuccess: (updated) => {
      toast.success(`✅ ${updated.company_name} is marked READY for onboarding!`)
      qc.invalidateQueries({ queryKey: ['customers-provisioning'] })
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err))
    },
  })

  const deboardMutation = useMutation({
    mutationFn: (id: number) => nocApi.deboard(id),
    onSuccess: () => {
      toast.success('Customer successfully deboarded and removed from router!')
      qc.invalidateQueries({ queryKey: ['customers-provisioning'] })
      setDeboardingCustomer(null)
      if (selectedCustomerId === deboardingCustomer?.id) {
        setSelectedCustomerId(null)
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err))
      setDeboardingCustomer(null)
    },
  })

  const rollbackNetworkMutation = useMutation({
    mutationFn: (id: number) => nocApi.rollbackNetwork(id),
    onSuccess: () => {
      toast.success('Step 1 network configuration rolled back and customer returned to DRAFT!')
      qc.invalidateQueries({ queryKey: ['customers-provisioning'] })
      setDeboardingCustomer(null)
      if (selectedCustomerId === deboardingCustomer?.id) {
        setSelectedCustomerId(null)
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err))
      setDeboardingCustomer(null)
    },
  })

  const flushSessionsMutation = useMutation({
    mutationFn: (id: number) => nocApi.flushSessions(id),
    onSuccess: () => {
      toast.success('All active sessions flushed successfully!')
      qc.invalidateQueries({ queryKey: ['customer-sessions', selectedCustomerId] })
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err))
    },
  })

  // ── Health Check Runner ───────────────────────────────────────────────
  const runInstanceHealthCheck = async (instId: number) => {
    setTestingInstanceId(instId)
    try {
      const res = await nocApi.health(instId)
      setInstanceHealthMap((prev) => ({
        ...prev,
        [instId]: {
          status: res.status === 'ok' ? 'HEALTHY' : 'DEGRADED',
          checkedAt: new Date().toLocaleTimeString(),
        },
      }))
      toast.success(`Router Instance #${instId}: ${res.status.toUpperCase()}`)
    } catch (err) {
      setInstanceHealthMap((prev) => ({
        ...prev,
        [instId]: {
          status: 'UNREACHABLE',
          checkedAt: new Date().toLocaleTimeString(),
        },
      }))
      toast.error(`Router Instance #${instId} unreachable`)
    } finally {
      setTestingInstanceId(null)
    }
  }

  // ── Filtered Datasets ─────────────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Tab filter: READY tab shows both staged READY and Step 1 NETWORK_CONFIGURED customers
      if (customerTab === 'READY' && c.status !== 'READY' && c.status !== 'NETWORK_CONFIGURED') return false
      if (customerTab === 'DRAFT' && c.status !== 'DRAFT') return false
      if (customerTab === 'ACTIVE' && c.status !== 'PUSHED' && c.status !== 'ACTIVE') return false

      // Search filter
      if (customerSearch.trim()) {
        const q = customerSearch.toLowerCase()
        const matchName = c.company_name?.toLowerCase().includes(q)
        const matchSlug = c.captive_customer_slug?.toLowerCase().includes(q)
        const matchAccount = c.user_account?.toLowerCase().includes(q)
        const matchQinQ = c.qinq_interface?.toLowerCase().includes(q)
        return matchName || matchSlug || matchAccount || matchQinQ
      }
      return true
    })
  }, [customers, customerTab, customerSearch])

  const filteredChangeRequests = useMemo(() => {
    return changeRequests.filter((cr) => {
      if (changeRequestFilter === 'ALL') return true
      return cr.status === changeRequestFilter
    })
  }, [changeRequests, changeRequestFilter])

  // Counts for Badges & Stats
  const countReadyCustomers = useMemo(
    () => customers.filter((c) => c.status === 'READY' || c.status === 'NETWORK_CONFIGURED').length,
    [customers]
  )
  const countDraftCustomers = useMemo(() => customers.filter((c) => c.status === 'DRAFT').length, [customers])
  const countActiveCustomers = useMemo(() => customers.filter((c) => c.status === 'PUSHED' || c.status === 'ACTIVE').length, [customers])
  const countPendingCRs = useMemo(() => changeRequests.filter((cr) => cr.status === 'PENDING').length, [changeRequests])

  const handleRefreshAll = () => {
    refetchInstances()
    refetchCustomers()
    refetchChangeRequests()
    toast.success('Provisioning dashboard refreshed')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <PageHeader
        title="Provisioning & Changes Dashboard"
        subtitle="Manage VyOS router fleet, customer onboarding queue, VLAN allocation capacity, and EB change requests"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshAll}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/noc/change-requests')}
              className="gap-1.5"
            >
              <GitPullRequest className="h-3.5 w-3.5 text-primary" />
              Change Requests Inbox
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/noc/router-proposals/new')}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Propose Router
            </Button>
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* ── KPI Stat Banner ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Router Fleet</p>
              <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{instances.length}</h4>
              <p className="text-[11.5px] text-slate-500 mt-1 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-primary" />
                <span>VyOS Instances in Fleet</span>
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Server className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ready to Onboard</p>
              <h4 className="text-2xl font-bold text-amber-600 mt-0.5">{countReadyCustomers}</h4>
              <p className="text-[11.5px] text-slate-500 mt-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{countDraftCustomers} awaiting net config</span>
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending Change Requests</p>
              <h4 className="text-2xl font-bold text-purple-600 mt-0.5">{countPendingCRs}</h4>
              <p className="text-[11.5px] text-slate-500 mt-1 flex items-center gap-1.5">
                <GitPullRequest className="h-3.5 w-3.5 text-purple-500" />
                <span>{changeRequests.length} total recorded</span>
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <GitPullRequest className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Tenants</p>
              <h4 className="text-2xl font-bold text-emerald-600 mt-0.5">{countActiveCustomers}</h4>
              <p className="text-[11.5px] text-slate-500 mt-1 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>Provisioned & live on VyOS</span>
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Main 2-Column Grid (Left: Panels 1, 2, 3; Right: Panel 4) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* ── Left 2 Columns ───────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-6">

          {/* ═════════════════════════════════════════════════════════════
              PANEL 1: Router Fleet Overview
          ═════════════════════════════════════════════════════════════ */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Server className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Router Fleet Overview</h3>
                  <p className="text-[11.5px] text-slate-500">VyOS edge instances & real-time health heartbeat status</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/noc/router-proposals')}
                  className="text-xs h-8"
                >
                  View Proposals
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/noc/router-proposals/new')}
                  className="text-xs h-8 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Instance
                </Button>
              </div>
            </CardHeader>

            <CardBody className="p-0">
              {loadingInstances ? (
                <div className="p-8 flex justify-center">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : instances.length === 0 ? (
                <div className="p-8 text-center">
                  <Server className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">No router instances configured</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Submit a router proposal to onboard a new VyOS instance into your scope.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => navigate('/noc/router-proposals/new')}
                  >
                    <Plus className="h-4 w-4" />
                    Create Router Proposal
                  </Button>
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Instance</Th>
                      <Th>Host & Port</Th>
                      <Th>Health Status</Th>
                      <Th>Assigned BA</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map((inst) => {
                      const healthInfo = instanceHealthMap[inst.id]
                      return (
                        <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                          <Td className="font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span>{inst.name || `VyOS Instance #${inst.id}`}</span>
                              <span className="text-[11px] font-mono text-slate-400">#{inst.id}</span>
                            </div>
                          </Td>
                          <Td className="font-mono text-xs text-slate-600">
                            {(inst.network?.vyos_ip || inst.host || '—')}:{(inst.auth?.ssh_port || inst.ssh_port || 22)}
                          </Td>
                          <Td>
                            {healthInfo ? (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium',
                                  healthInfo.status === 'HEALTHY'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                )}
                              >
                                <span className={cn('h-1.5 w-1.5 rounded-full', healthInfo.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-rose-500')} />
                                {healthInfo.status}
                                <span className="text-[10px] text-slate-400">({healthInfo.checkedAt})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                Untested
                              </span>
                            )}
                          </Td>
                          <Td className="text-xs text-slate-600">
                            {inst.location?.ba || inst.location?.circle || 'All / General'}
                          </Td>
                          <Td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="secondary"
                                size="xs"
                                className="h-7 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                                onClick={() => setTopologyModalInstanceId(inst.instance_id || inst.id)}
                              >
                                <Layers className="h-3 w-3 text-blue-600" />
                                Topology
                              </Button>

                              <Button
                                variant="secondary"
                                size="xs"
                                className="h-7 text-xs gap-1"
                                disabled={testingInstanceId === inst.id}
                                onClick={() => runInstanceHealthCheck(inst.id)}
                              >
                                {testingInstanceId === inst.id ? (
                                  <Spinner className="h-3 w-3" />
                                ) : (
                                  <Activity className="h-3 w-3 text-primary" />
                                )}
                                Ping
                              </Button>

                              <Button
                                variant="secondary"
                                size="xs"
                                className="h-7 text-xs gap-1 text-teal-700 border-teal-200 hover:bg-teal-50"
                                onClick={() => {
                                  setInterfaceSetupTargetInstanceId(inst.id)
                                  setInterfaceSetupForm({
                                    interface: inst.network?.wan_interface || 'eth0',
                                    svlan: 100,
                                    cvlan: 1001,
                                    ip_cidr: '10.45.1.1/24',
                                  })
                                  setInterfaceSetupModalOpen(true)
                                }}
                              >
                                <Network className="h-3 w-3 text-teal-600" />
                                Setup QinQ
                              </Button>
                            </div>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>


          {/* ═════════════════════════════════════════════════════════════
              PANEL 2: Customer Onboarding Queue
          ═════════════════════════════════════════════════════════════ */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <Users className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Customer Onboarding Queue</h3>
                  <p className="text-[11.5px] text-slate-500">Staged enterprise customers awaiting multi-step onboarding & activation</p>
                </div>
              </div>

              {/* Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setCustomerTab('READY')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition-all',
                      customerTab === 'READY'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Ready ({countReadyCustomers})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerTab('DRAFT')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition-all',
                      customerTab === 'DRAFT'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Draft ({countDraftCustomers})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerTab('ACTIVE')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition-all',
                      customerTab === 'ACTIVE'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Active ({countActiveCustomers})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerTab('ALL')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition-all',
                      customerTab === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    All ({customers.length})
                  </button>
                </div>

                <div className="relative w-44">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tenant..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </CardHeader>

            <CardBody className="p-0">
              {loadingCustomers ? (
                <div className="p-8 flex justify-center">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">No customers found in this view</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {customerTab === 'READY'
                      ? 'No staged customers are currently awaiting onboarding.'
                      : 'Try selecting a different filter tab or clearing your search.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Company / Account</Th>
                      <Th>Status</Th>
                      <Th>VLAN & Interface</Th>
                      <Th>Bandwidth</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((cust) => {
                      const isReady = cust.status === 'READY'
                      const isNetworkConfigured = cust.status === 'NETWORK_CONFIGURED'
                      const isDraft = cust.status === 'DRAFT'
                      const isActive = cust.status === 'PUSHED' || cust.status === 'ACTIVE'

                      return (
                        <tr
                          key={cust.id}
                          className={cn(
                            'hover:bg-slate-50/70 transition-colors cursor-pointer',
                            selectedCustomerId === cust.id && 'bg-blue-50/40'
                          )}
                          onClick={() => setSelectedCustomerId(cust.id)}
                        >
                          <Td>
                            <div className="font-semibold text-slate-900 text-xs">
                              {cust.company_name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {cust.user_account || cust.captive_customer_slug || `ID #${cust.id}`}
                            </div>
                          </Td>
                          <Td>
                            <StatusBadge status={cust.status} />
                          </Td>
                          <Td>
                            <div className="text-xs text-slate-700 font-mono">
                              SVLAN {cust.svlan ?? '—'} / CVLAN {cust.cvlan ?? '—'}
                            </div>
                            <div className="text-[10.5px] text-slate-400 font-mono">
                              {cust.qinq_interface || 'eth0'} → {cust.wan_interface || 'eth1'}
                            </div>
                          </Td>
                          <Td className="text-xs text-slate-600 font-mono">
                            {cust.max_bandwidth || '1gbit'}
                          </Td>
                          <Td className="text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                              <Button
                                variant="secondary"
                                size="xs"
                                className="h-7 text-xs gap-1"
                                onClick={() => setSelectedCustomerId(cust.id)}
                              >
                                <Eye className="h-3 w-3 text-slate-500" />
                                Inspect
                              </Button>

                              {isReady && (
                                <Button
                                  variant="primary"
                                  size="xs"
                                  className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                                  onClick={() => navigate(`/noc/customers/${cust.id}/onboard`)}
                                >
                                  <Play className="h-3 w-3" />
                                  Onboard
                                </Button>
                              )}

                              {isNetworkConfigured && (
                                <>
                                  <Button
                                    variant="primary"
                                    size="xs"
                                    className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => navigate(`/noc/customers/${cust.id}/onboard`)}
                                  >
                                    <Play className="h-3 w-3" />
                                    Resume Step 2
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="xs"
                                    className="h-7 text-xs gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                                    onClick={() => setDeboardingCustomer(cust)}
                                    title="Rollback Step 1 interface and DHCP"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Rollback
                                  </Button>
                                </>
                              )}

                              {isDraft && (
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                  disabled={markReadyMutation.isPending}
                                  onClick={() => markReadyMutation.mutate(cust.id)}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Mark Ready
                                </Button>
                              )}

                              {isActive && (
                                <Button
                                  variant="danger"
                                  size="xs"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => setDeboardingCustomer(cust)}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Deboard
                                </Button>
                              )}
                            </div>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>


          {/* ═════════════════════════════════════════════════════════════
              PANEL 3: EB Change Request Inbox
          ═════════════════════════════════════════════════════════════ */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-50 text-purple-600">
                  <GitPullRequest className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">EB Change Request Inbox</h3>
                  <p className="text-[11.5px] text-slate-500">Live stream of customer policy & bandwidth modification requests</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                  {(['PENDING', 'IN_REVIEW', 'NEEDS_INFO', 'ALL'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setChangeRequestFilter(status)}
                      className={cn(
                        'px-2 py-0.5 rounded-md transition-all',
                        changeRequestFilter === status
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  size="xs"
                  className="h-7 text-xs gap-1"
                  onClick={() => navigate('/noc/change-requests')}
                >
                  Full Inbox
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>

            <CardBody className="p-0">
              {loadingChangeRequests ? (
                <div className="p-8 flex justify-center">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : filteredChangeRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <GitPullRequest className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">No pending change requests</p>
                  <p className="text-xs text-slate-400 mt-1">All enterprise configuration change requests are up to date.</p>
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Req ID</Th>
                      <Th>Customer</Th>
                      <Th>Change Type</Th>
                      <Th>Status</Th>
                      <Th>EB Notes</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChangeRequests.slice(0, 5).map((cr) => {
                      const cust = customers.find((c) => c.id === cr.customer_id)
                      return (
                        <tr key={cr.id} className="hover:bg-slate-50/70 transition-colors">
                          <Td className="font-mono text-xs text-slate-600 font-semibold">
                            #{cr.id}
                          </Td>
                          <Td>
                            <div className="text-xs font-semibold text-slate-900">
                              {cust?.company_name || `Customer #${cr.customer_id}`}
                            </div>
                            <div className="text-[10.5px] text-slate-400">
                              {formatAge(cr.requested_at)}
                            </div>
                          </Td>
                          <Td>
                            <ChangeRequestTypeBadge type={cr.request_type} />
                          </Td>
                          <Td>
                            <ChangeRequestStatusBadge status={cr.status} />
                          </Td>
                          <Td className="text-xs text-slate-600 max-w-xs truncate">
                            {cr.eb_notes || '—'}
                          </Td>
                          <Td className="text-right">
                            <Button
                              variant="secondary"
                              size="xs"
                              className="h-7 text-xs gap-1"
                              onClick={() => navigate('/noc/change-requests')}
                            >
                              Review
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>


        {/* ── Right Column (Panel 4: VLAN Utilization Summary) ─────── */}
        <div className="space-y-6">

          {/* ═════════════════════════════════════════════════════════════
              PANEL 4: VLAN Utilization Summary
          ═════════════════════════════════════════════════════════════ */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-600">
                    <Network className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">VLAN Utilization Summary</h3>
                    <p className="text-[11.5px] text-slate-500">Circle & BA SVLAN/CVLAN allocation pools</p>
                  </div>
                </div>

                {circles.length > 1 && (
                  <select
                    value={activeCircleId}
                    onChange={(e) => setSelectedCircleId(Number(e.target.value))}
                    className="h-7 text-xs rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium"
                  >
                    {circles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </CardHeader>

            <CardBody className="space-y-5 p-4">
              {/* Circle Pools Overview */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
                  <span>Circle Master Pools</span>
                  <span className="text-[11px] font-normal text-slate-400 font-mono">
                    {circleVlanPools.length} pool(s)
                  </span>
                </h4>

                {circleVlanPools.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                    No circle VLAN pools configured for this circle.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {circleVlanPools.map((pool) => (
                      <div
                        key={pool.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-semibold text-slate-800">
                            SVLAN Pool Range
                          </span>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            SVLAN {pool.svlan_range_start} – {pool.svlan_range_end}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10.5px] font-medium text-slate-500">
                            CVLAN per SVLAN
                          </span>
                          <p className="text-xs font-mono font-bold text-teal-700">
                            {pool.cvlan_range_start} – {pool.cvlan_range_end}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BA Allocations Breakdown */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
                  <span>Business Area SVLAN Allocations</span>
                  <span className="text-[11px] font-normal text-slate-400 font-mono">
                    {baAllocations.length} active
                  </span>
                </h4>

                {baAllocations.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                    No SVLAN allocations found for current Business Area.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {baAllocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className={cn(
                          'rounded-xl border p-3 transition-all',
                          alloc.is_exhausted
                            ? 'border-rose-200 bg-rose-50/30'
                            : 'border-slate-200 bg-white hover:border-teal-300'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-lg bg-teal-50 text-teal-700 font-mono font-bold text-xs flex items-center justify-center">
                              {alloc.svlan}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-slate-900">
                                SVLAN {alloc.svlan}
                              </span>
                              <p className="text-[10.5px] text-slate-500 font-mono">
                                CVLAN {alloc.cvlan_range_start} – {alloc.cvlan_range_end}
                              </p>
                            </div>
                          </div>

                          {alloc.is_exhausted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                              Exhausted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                              Available
                            </span>
                          )}
                        </div>

                        {alloc.notes && (
                          <p className="text-[11px] text-slate-500 mt-2 italic bg-slate-50 p-1.5 rounded-md">
                            {alloc.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Link */}
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs text-slate-700 justify-center gap-1.5"
                  onClick={() => navigate('/business-areas')}
                >
                  <Sliders className="h-3.5 w-3.5 text-teal-600" />
                  Manage Master Data & Allocations
                </Button>
              </div>
            </CardBody>
          </Card>

        </div>
      </div>


      {/* ═════════════════════════════════════════════════════════════
          PANEL 5: Customer Provisioning Detail Drawer (Slide-Over)
      ═════════════════════════════════════════════════════════════ */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {selectedCustomer.company_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedCustomer.company_name}
                    </h3>
                    <StatusBadge status={selectedCustomer.status} />
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Slug: {selectedCustomer.captive_customer_slug} • ID #{selectedCustomer.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-5 gap-1 bg-slate-50/30 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setDrawerTab('network')}
                className={cn(
                  'py-3 px-3 border-b-2 transition-all flex items-center gap-1.5',
                  drawerTab === 'network'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <Network className="h-3.5 w-3.5" />
                Network Topology
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('nftables')}
                className={cn(
                  'py-3 px-3 border-b-2 transition-all flex items-center gap-1.5',
                  drawerTab === 'nftables'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Nftables Firewall
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('tc')}
                className={cn(
                  'py-3 px-3 border-b-2 transition-all flex items-center gap-1.5',
                  drawerTab === 'tc'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <Cpu className="h-3.5 w-3.5" />
                TC QoS Tree
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('sessions')}
                className={cn(
                  'py-3 px-3 border-b-2 transition-all flex items-center gap-1.5',
                  drawerTab === 'sessions'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <Wifi className="h-3.5 w-3.5" />
                Active Sessions
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('diagnostics')}
                className={cn(
                  'py-3 px-3 border-b-2 transition-all flex items-center gap-1.5',
                  drawerTab === 'diagnostics'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <Activity className="h-3.5 w-3.5" />
                Diagnostics Check
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Tab 1: Network Topology */}
              {drawerTab === 'network' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium">QinQ Interface</span>
                      <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                        {selectedCustomer.qinq_interface || 'eth0'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium">WAN Interface</span>
                      <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                        {selectedCustomer.wan_interface || 'eth1'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium">Service VLAN (SVLAN)</span>
                      <p className="text-sm font-mono font-bold text-teal-700 mt-0.5">
                        {selectedCustomer.svlan ?? 'Not configured'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium">Customer VLAN (CVLAN)</span>
                      <p className="text-sm font-mono font-bold text-teal-700 mt-0.5">
                        {selectedCustomer.cvlan ?? 'Not configured'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 col-span-2">
                      <span className="text-[11px] text-slate-400 font-medium">Allocated IP Subnet Range</span>
                      <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                        {selectedCustomer.start_ip || '0.0.0.0'} → {selectedCustomer.end_ip || '0.0.0.0'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium">QoS Mode</span>
                      <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                        {selectedCustomer.qos_mode || 'per_user'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium">Bandwidth Profile Limit</span>
                      <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                        {selectedCustomer.max_bandwidth || '1gbit'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                    <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs mb-1">
                      <Globe className="h-4 w-4 text-blue-600" />
                      Captive Portal Gateway Configuration
                    </div>
                    <p className="text-xs text-blue-700">
                      Domain: <span className="font-mono font-bold">{selectedCustomer.portal_domain || 'default.bsnl.in'}</span> • Entry Mode: <span className="font-mono">{selectedCustomer.portal_entry_mode}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Nftables Chain Status */}
              {drawerTab === 'nftables' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Router Nftables Rule Tables
                    </h4>
                    <Button variant="secondary" size="xs" className="h-7 text-xs gap-1" onClick={() => refetchNftables()}>
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </Button>
                  </div>

                  {loadingNftables ? (
                    <div className="p-8 flex justify-center">
                      <Spinner className="h-6 w-6" />
                    </div>
                  ) : nftablesData ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        Firewall Chains Provisioned & Active on Router
                      </div>
                      <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto max-h-80 leading-relaxed">
                        {JSON.stringify(nftablesData, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      No active nftables rules found for this customer on the router.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: TC QoS Tree */}
              {drawerTab === 'tc' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Traffic Control (TC HTB) Status
                    </h4>
                    <Button variant="secondary" size="xs" className="h-7 text-xs gap-1" onClick={() => refetchTC()}>
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </Button>
                  </div>

                  {loadingTC ? (
                    <div className="p-8 flex justify-center">
                      <Spinner className="h-6 w-6" />
                    </div>
                  ) : tcData ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-blue-600" />
                        TC Hierarchical Token Bucket (HTB) Qdisc Initialized
                      </div>
                      <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto max-h-80 leading-relaxed">
                        {JSON.stringify(tcData, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      No TC QoS qdisc is currently attached for this tenant.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Active Sessions */}
              {drawerTab === 'sessions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Active User Sessions ({sessionsData?.sessions?.length || 0})
                    </h4>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="xs" className="h-7 text-xs gap-1" onClick={() => refetchSessions()}>
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        className="h-7 text-xs gap-1"
                        disabled={flushSessionsMutation.isPending || !sessionsData?.sessions?.length}
                        onClick={() => selectedCustomer && flushSessionsMutation.mutate(selectedCustomer.id)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Flush Sessions
                      </Button>
                    </div>
                  </div>

                  {loadingSessions ? (
                    <div className="p-8 flex justify-center">
                      <Spinner className="h-6 w-6" />
                    </div>
                  ) : !sessionsData?.sessions || sessionsData.sessions.length === 0 ? (
                    <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      No active WiFi user sessions currently connected.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <Table>
                        <thead>
                          <tr>
                            <Th>IP Address</Th>
                            <Th>MAC Address</Th>
                            <Th>Started</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessionsData.sessions.map((sess: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <Td className="font-mono text-xs">{sess.ip_address || sess.ip}</Td>
                              <Td className="font-mono text-xs text-slate-600">{sess.mac_address || sess.mac || '—'}</Td>
                              <Td className="text-xs text-slate-500">{formatAge(sess.start_time || sess.created_at)}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Pre-Flight Diagnostics Check */}
              {drawerTab === 'diagnostics' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-primary" />
                        Multi-Point Fault Localization Matrix
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Parallel pre-flight verification across DB, Nftables, TC QoS tree, live sessions, and 24h auth logs.
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      size="xs"
                      className="gap-1 text-xs"
                      disabled={fetchingFaultCheck}
                      onClick={() => refetchFaultCheck()}
                    >
                      <RefreshCw className={cn('h-3 w-3', fetchingFaultCheck && 'animate-spin')} />
                      Re-run Checks
                    </Button>
                  </div>

                  {loadingFaultCheck ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <Spinner className="h-6 w-6 mx-auto mb-2" />
                      <p className="text-xs text-slate-600 font-medium">Running 5 concurrent diagnostics checks...</p>
                    </div>
                  ) : faultCheckData ? (
                    <div className="space-y-3">
                      {/* Overall Health Status Banner */}
                      <div
                        className={cn(
                          'p-3.5 rounded-xl border flex items-center justify-between',
                          faultCheckData.overall === 'healthy'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : faultCheckData.overall === 'degraded'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-rose-50/70 border-rose-200 text-rose-900'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {faultCheckData.overall === 'healthy' ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          ) : faultCheckData.overall === 'degraded' ? (
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          ) : (
                            <X className="h-5 w-5 text-rose-600" />
                          )}
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider">
                              Overall Health: {faultCheckData.overall}
                            </span>
                            <p className="text-[11px] opacity-80 mt-0.5">
                              {faultCheckData.overall === 'healthy'
                                ? 'All 5 subsystems verified operational with zero faults.'
                                : faultCheckData.overall === 'degraded'
                                ? 'One or more non-critical checks reported warnings or unreachable states.'
                                : 'Master tenant record is inactive or missing.'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                            faultCheckData.overall === 'healthy'
                              ? 'bg-emerald-200/60 text-emerald-800'
                              : faultCheckData.overall === 'degraded'
                              ? 'bg-amber-200/60 text-amber-800'
                              : 'bg-rose-200/60 text-rose-800'
                          )}
                        >
                          {faultCheckData.overall}
                        </span>
                      </div>

                      {/* 5 Check Cards */}
                      <div className="space-y-2 text-xs">
                        {/* 1. DB Status */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', faultCheckData.checks?.db_status?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500')} />
                            <div>
                              <span className="font-semibold text-slate-800">1. Database Record Status</span>
                              <p className="text-[10.5px] text-slate-400">Master database active & pushed flag</p>
                            </div>
                          </div>
                          <span className={cn('font-bold font-mono', faultCheckData.checks?.db_status?.status === 'ok' ? 'text-emerald-600' : 'text-rose-600')}>
                            {faultCheckData.checks?.db_status?.status?.toUpperCase()}
                          </span>
                        </div>

                        {/* 2. Nftables */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', faultCheckData.checks?.nftables?.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500')} />
                            <div>
                              <span className="font-semibold text-slate-800">2. Nftables Firewall Chains</span>
                              <p className="text-[10.5px] text-slate-400">
                                {faultCheckData.checks?.nftables?.detail || 'Authenticated sets & NAT rules'}
                              </p>
                            </div>
                          </div>
                          <span className={cn('font-bold font-mono', faultCheckData.checks?.nftables?.status === 'ok' ? 'text-emerald-600' : 'text-amber-600')}>
                            {faultCheckData.checks?.nftables?.status?.toUpperCase()}
                          </span>
                        </div>

                        {/* 3. TC QoS */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', faultCheckData.checks?.tc_qos?.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500')} />
                            <div>
                              <span className="font-semibold text-slate-800">3. TC QoS HTB Hierarchy</span>
                              <p className="text-[10.5px] text-slate-400">
                                {faultCheckData.checks?.tc_qos?.detail || 'Root HTB qdisc & bandwidth classes'}
                              </p>
                            </div>
                          </div>
                          <span className={cn('font-bold font-mono', faultCheckData.checks?.tc_qos?.status === 'ok' ? 'text-emerald-600' : 'text-amber-600')}>
                            {faultCheckData.checks?.tc_qos?.status?.toUpperCase()}
                          </span>
                        </div>

                        {/* 4. Active Sessions */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <div>
                              <span className="font-semibold text-slate-800">4. Active IP Sessions</span>
                              <p className="text-[10.5px] text-slate-400">
                                {faultCheckData.checks?.active_sessions?.note || 'Live connected client sessions'}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold font-mono text-slate-700">
                            {faultCheckData.checks?.active_sessions?.count ?? 0} active
                          </span>
                        </div>

                        {/* 5. 24h Auth Failures */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', (faultCheckData.checks?.auth_failures_24h?.count ?? 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500')} />
                            <div>
                              <span className="font-semibold text-slate-800">5. 24h Authentication Failures</span>
                              <p className="text-[10.5px] text-slate-400">RADIUS rejected log count in last 24h</p>
                            </div>
                          </div>
                          <span className={cn('font-bold font-mono', (faultCheckData.checks?.auth_failures_24h?.count ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                            {faultCheckData.checks?.auth_failures_24h?.count ?? 0} failures
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <Activity className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-600 font-medium">No diagnostics report yet</p>
                      <Button
                        variant="primary"
                        size="xs"
                        className="mt-3 gap-1"
                        onClick={() => refetchFaultCheck()}
                      >
                        <Play className="h-3 w-3" />
                        Run Pre-Flight Diagnostics
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/customers/${selectedCustomer.id}`)}
                className="text-xs gap-1"
              >
                View Full Staging Profile
                <ExternalLink className="h-3 w-3" />
              </Button>

              <div className="flex items-center gap-2">
                {selectedCustomer.status === 'READY' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={onboardMutation.isPending}
                      onClick={() => onboardMutation.mutate(selectedCustomer.id)}
                    >
                      {onboardMutation.isPending ? (
                        <Spinner className="h-3 w-3 text-white" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      1-Click Push to Router
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      onClick={() => navigate(`/noc/customers/${selectedCustomer.id}/onboard`)}
                    >
                      Wizard
                    </Button>
                  </>
                )}
                {selectedCustomer.status === 'NETWORK_CONFIGURED' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => navigate(`/noc/customers/${selectedCustomer.id}/onboard`)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Resume Step 2 (NFTables & TC)
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="text-xs"
                      onClick={() => setDeboardingCustomer(selectedCustomer)}
                    >
                      Rollback Step 1
                    </Button>
                  </>
                )}
                {selectedCustomer.status === 'DRAFT' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                    disabled={markReadyMutation.isPending}
                    onClick={() => markReadyMutation.mutate(selectedCustomer.id)}
                  >
                    Mark Ready
                  </Button>
                )}
                {(selectedCustomer.status === 'PUSHED' || selectedCustomer.status === 'ACTIVE') && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="text-xs"
                    onClick={() => setDeboardingCustomer(selectedCustomer)}
                  >
                    Deboard from Router
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Deboard / Rollback Confirm Dialog ────────────────────────── */}
      {deboardingCustomer && (
        <ConfirmDialog
          isOpen={Boolean(deboardingCustomer)}
          title={
            deboardingCustomer.status === 'NETWORK_CONFIGURED'
              ? `Rollback Step 1 for ${deboardingCustomer.company_name}?`
              : `Deboard ${deboardingCustomer.company_name}?`
          }
          description={
            deboardingCustomer.status === 'NETWORK_CONFIGURED'
              ? `This will remove the QinQ interface, DHCP pool, and DNS forwarding from VyOS, release the allocated IP subnet, and return ${deboardingCustomer.company_name} to DRAFT status.`
              : `This will execute the VyOS deboarding sequence for ${deboardingCustomer.company_name}, flush all active firewall rules, remove TC QoS trees, and disconnect active sessions.`
          }
          confirmText={
            deboardingCustomer.status === 'NETWORK_CONFIGURED'
              ? "Rollback Step 1"
              : "Deboard Tenant"
          }
          variant="danger"
          isLoading={
            deboardingCustomer.status === 'NETWORK_CONFIGURED'
              ? rollbackNetworkMutation.isPending
              : deboardMutation.isPending
          }
          onConfirm={() => {
            if (deboardingCustomer.status === 'NETWORK_CONFIGURED') {
              rollbackNetworkMutation.mutate(deboardingCustomer.id)
            } else {
              deboardMutation.mutate(deboardingCustomer.id)
            }
          }}
          onClose={() => setDeboardingCustomer(null)}
        />
      )}
      </div>

      {/* ── Interface Setup Modal ─────────────────────────────────────── */}
      {interfaceSetupModalOpen && interfaceSetupTargetInstanceId && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  <Network className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Configure QinQ Interface
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Router Instance #{interfaceSetupTargetInstanceId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInterfaceSetupModalOpen(false)}
                className="h-7 w-7 rounded-full hover:bg-slate-200 text-slate-400 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                interfaceSetupMutation.mutate({
                  instanceId: interfaceSetupTargetInstanceId,
                  data: {
                    interface: interfaceSetupForm.interface,
                    svlan: Number(interfaceSetupForm.svlan),
                    cvlan: Number(interfaceSetupForm.cvlan),
                    ip_cidr: interfaceSetupForm.ip_cidr,
                  },
                })
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Base Interface (e.g. eth0)
                </label>
                <input
                  type="text"
                  required
                  value={interfaceSetupForm.interface}
                  onChange={(e) => setInterfaceSetupForm({ ...interfaceSetupForm, interface: e.target.value })}
                  placeholder="eth0"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Service VLAN (SVLAN)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={4094}
                    value={interfaceSetupForm.svlan}
                    onChange={(e) => setInterfaceSetupForm({ ...interfaceSetupForm, svlan: Number(e.target.value) })}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Customer VLAN (CVLAN)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={4094}
                    value={interfaceSetupForm.cvlan}
                    onChange={(e) => setInterfaceSetupForm({ ...interfaceSetupForm, cvlan: Number(e.target.value) })}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  IP CIDR (e.g. 10.45.1.1/24)
                </label>
                <input
                  type="text"
                  required
                  value={interfaceSetupForm.ip_cidr}
                  onChange={(e) => setInterfaceSetupForm({ ...interfaceSetupForm, ip_cidr: e.target.value })}
                  placeholder="10.45.1.1/24"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Applies MTU 1492 and TCP MSS 1452 clamping automatically. Rate limited to 1 call per 30s.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setInterfaceSetupModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={interfaceSetupMutation.isPending}
                  className="gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {interfaceSetupMutation.isPending && <Spinner className="h-3 w-3 text-white" />}
                  Execute Setup
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Request Review Modal ───────────────────────────────── */}
      {reviewModalOpen && reviewTargetReq && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-50 text-purple-600">
                  <GitPullRequest className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Review Change Request #{reviewTargetReq.id}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {reviewTargetReq.request_type} • Customer #{reviewTargetReq.customer_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="h-7 w-7 rounded-full hover:bg-slate-200 text-slate-400 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">EB Submitted Notes:</span>
                <p className="text-xs text-slate-800 italic">
                  {reviewTargetReq.eb_notes || 'No comments provided by EB manager.'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Review Action:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APPROVE')}
                    className={cn(
                      'py-2 px-2.5 rounded-lg border text-center font-bold text-xs transition-all',
                      reviewAction === 'APPROVE'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('RETURN')}
                    className={cn(
                      'py-2 px-2.5 rounded-lg border text-center font-bold text-xs transition-all',
                      reviewAction === 'RETURN'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    Return
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('REJECT')}
                    className={cn(
                      'py-2 px-2.5 rounded-lg border text-center font-bold text-xs transition-all',
                      reviewAction === 'REJECT'
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {reviewAction !== 'APPROVE' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Review Comments & Rationale (Required):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Enter reason for returning or rejecting this request..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setReviewModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={reviewAction === 'APPROVE' ? 'primary' : reviewAction === 'RETURN' ? 'secondary' : 'danger'}
                  disabled={approveCRMutation.isPending || rejectCRMutation.isPending || returnCRMutation.isPending || (reviewAction !== 'APPROVE' && !reviewComments.trim())}
                  onClick={() => {
                    if (reviewAction === 'APPROVE') {
                      approveCRMutation.mutate(reviewTargetReq.id)
                    } else if (reviewAction === 'RETURN') {
                      returnCRMutation.mutate({ id: reviewTargetReq.id, comments: reviewComments })
                    } else {
                      rejectCRMutation.mutate({ id: reviewTargetReq.id, comments: reviewComments })
                    }
                  }}
                  className={cn(
                    'gap-1 text-white',
                    reviewAction === 'APPROVE' && 'bg-emerald-600 hover:bg-emerald-700',
                    reviewAction === 'RETURN' && 'bg-amber-600 hover:bg-amber-700 text-white'
                  )}
                >
                  Confirm {reviewAction}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Router Topology Modal */}
      <RouterTopologyModal
        instanceId={topologyModalInstanceId}
        isOpen={Boolean(topologyModalInstanceId)}
        onClose={() => setTopologyModalInstanceId(null)}
      />

    </div>
  )
}

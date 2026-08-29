import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Clock,
  Server,
  Globe,
  Building,
  Database,
  Lock,
  Layers,
  Edit3,
  Save,
} from 'lucide-react'
import { nocApi } from '@/api/noc'
import { circlesApi, businessAreasApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { PageLoader } from '@/components/ui/Spinner'
import type { RouterProposal, RouterProposalStatus, RouterProposalUpdate } from '@/types'

function formatStatusBadge(status: RouterProposalStatus) {
  switch (status) {
    case 'draft':
      return <Badge label="Draft" variant="default" />
    case 'pending_approval':
      return <Badge label="Pending Approval" variant="warning" />
    case 'approved':
      return <Badge label="Approved" variant="info" />
    case 'provisioned':
      return <Badge label="Provisioned" variant="success" />
    case 'rejected':
      return <Badge label="Rejected" variant="danger" />
    default:
      return <Badge label={status} />
  }
}

export function RouterApprovalsPage() {
  useRequireAuth(['SUPER_ADMIN'])
  const qc = useQueryClient()

  const [selectedProposal, setSelectedProposal] = useState<RouterProposal | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('pending_approval')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Action Modals State
  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false)
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false)
  const [isReturnOpen, setIsReturnOpen] = useState<boolean>(false)
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false)

  // Approve Form Fields State (including superadmin override for name, ID, and identifier)
  const [approveName, setApproveName] = useState<string>('')
  const [approveInstanceId, setApproveInstanceId] = useState<number | string>('')
  const [approveIdentifier, setApproveIdentifier] = useState<string>('')
  const [captiveDbDsn, setCaptiveDbDsn] = useState<string>('')
  const [natDbDsn, setNatDbDsn] = useState<string>('')
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [returnNotes, setReturnNotes] = useState<string>('')

  // Edit Proposal Form State
  const [editForm, setEditForm] = useState<{
    name: string
    proposed_instance_id: number | string
    identifier: string
    nas_identifier: string
    vyos_ip: string
    vyos_management_ip: string
    wan_interface: string
    wan_max_bandwidth: string
    cvlan_start: string
    cvlan_end: string
    notes: string
  }>({
    name: '',
    proposed_instance_id: '',
    identifier: '',
    nas_identifier: '',
    vyos_ip: '',
    vyos_management_ip: '',
    wan_interface: 'eth0',
    wan_max_bandwidth: '1gbit',
    cvlan_start: '',
    cvlan_end: '',
    notes: '',
  })

  // 1. Fetch Proposals
  const {
    data: proposals = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['noc-router-proposals'],
    queryFn: () => nocApi.listRouterProposals(),
    staleTime: 10_000,
  })

  // 2. Fetch Circles & BAs for name lookups
  const { data: circles = [] } = useQuery({
    queryKey: ['circles'],
    queryFn: () => circlesApi.list(),
    staleTime: 60_000,
  })

  const { data: businessAreas = [] } = useQuery({
    queryKey: ['business-areas'],
    queryFn: () => businessAreasApi.list(),
    staleTime: 60_000,
  })

  const circleMap = new Map(circles.map((c) => [c.id, c]))
  const baMap = new Map(businessAreas.map((b) => [b.id, b]))

  // 3. Approve Mutation (with name, ID, identifier overrides)
  const approveMutation = useMutation({
    mutationFn: ({
      id,
      captive_db_dsn,
      nat_db_dsn,
      name,
      proposed_instance_id,
      identifier,
    }: {
      id: number
      captive_db_dsn?: string
      nat_db_dsn?: string
      name?: string
      proposed_instance_id?: number
      identifier?: string
    }) =>
      nocApi.approveRouterProposal(id, {
        captive_db_dsn,
        nat_db_dsn,
        name,
        proposed_instance_id,
        identifier,
      }),
    onSuccess: (updated) => {
      toast.success(`Router "${updated.name}" (ID #${updated.proposed_instance_id || updated.id}) approved & provisioned successfully`)
      qc.invalidateQueries({ queryKey: ['noc-router-proposals'] })
      setIsApproveOpen(false)
      setSelectedProposal(null)
      setCaptiveDbDsn('')
      setNatDbDsn('')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || 'Failed to approve router proposal')
    },
  })

  // 4. Update Proposal Mutation (for Super Admin to edit ID, name, network params)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RouterProposalUpdate }) =>
      nocApi.updateRouterProposal(id, data),
    onSuccess: (updated) => {
      toast.success(`Proposal "${updated.name}" (ID #${updated.proposed_instance_id}) updated successfully`)
      qc.invalidateQueries({ queryKey: ['noc-router-proposals'] })
      setSelectedProposal(updated)
      setIsEditOpen(false)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || 'Failed to update proposal')
    },
  })

  // 5. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      nocApi.rejectRouterProposal(id, { rejection_reason: reason }),
    onSuccess: (updated) => {
      toast.success(`Proposal "${updated.name}" rejected`)
      qc.invalidateQueries({ queryKey: ['noc-router-proposals'] })
      setIsRejectOpen(false)
      setSelectedProposal(null)
      setRejectionReason('')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || 'Failed to reject router proposal')
    },
  })

  // 6. Return Mutation
  const returnMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      nocApi.returnRouterProposal(id, { noc_return_notes: notes }),
    onSuccess: (updated) => {
      toast.success(`Proposal "${updated.name}" returned for revision`)
      qc.invalidateQueries({ queryKey: ['noc-router-proposals'] })
      setIsReturnOpen(false)
      setSelectedProposal(null)
      setReturnNotes('')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || 'Failed to return router proposal')
    },
  })

  const handleOpenApprove = (p: RouterProposal) => {
    setApproveName(p.name)
    setApproveInstanceId(p.proposed_instance_id)
    setApproveIdentifier(p.identifier)
    setCaptiveDbDsn('')
    setNatDbDsn('')
    setIsApproveOpen(true)
  }

  const handleOpenEdit = (p: RouterProposal) => {
    setEditForm({
      name: p.name,
      proposed_instance_id: p.proposed_instance_id,
      identifier: p.identifier,
      nas_identifier: p.nas_identifier,
      vyos_ip: p.vyos_ip,
      vyos_management_ip: p.vyos_management_ip,
      wan_interface: p.wan_interface || 'eth0',
      wan_max_bandwidth: p.wan_max_bandwidth || '1gbit',
      cvlan_start: p.cvlan_start ? String(p.cvlan_start) : '',
      cvlan_end: p.cvlan_end ? String(p.cvlan_end) : '',
      notes: p.notes || '',
    })
    setIsEditOpen(true)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProposal) return
    if (!editForm.name.trim()) {
      toast.error('Router name is required')
      return
    }
    if (!editForm.proposed_instance_id) {
      toast.error('Proposed instance ID is required')
      return
    }
    updateMutation.mutate({
      id: selectedProposal.id,
      data: {
        name: editForm.name.trim(),
        proposed_instance_id: Number(editForm.proposed_instance_id),
        identifier: editForm.identifier.trim() || undefined,
        nas_identifier: editForm.nas_identifier.trim() || undefined,
        vyos_ip: editForm.vyos_ip.trim() || undefined,
        vyos_management_ip: editForm.vyos_management_ip.trim() || undefined,
        wan_interface: editForm.wan_interface.trim() || undefined,
        wan_max_bandwidth: editForm.wan_max_bandwidth.trim() || undefined,
        cvlan_start: editForm.cvlan_start ? Number(editForm.cvlan_start) : null,
        cvlan_end: editForm.cvlan_end ? Number(editForm.cvlan_end) : null,
        notes: editForm.notes.trim() || undefined,
      },
    })
  }

  const filteredProposals = proposals.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.identifier.toLowerCase().includes(q) ||
      p.vyos_ip.toLowerCase().includes(q) ||
      p.nas_identifier.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const pendingCount = proposals.filter((p) => p.status === 'pending_approval').length

  if (isLoading) {
    return <PageLoader />
  }

  const countPending = proposals.filter((p) => p.status === 'pending_approval').length
  const countProvisioned = proposals.filter((p) => p.status === 'provisioned').length
  const countRejected = proposals.filter((p) => p.status === 'rejected').length
  const countDraft = proposals.filter((p) => p.status === 'draft').length

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Router Approvals"
        subtitle="Review, approve, reject, or return edge router provisioning proposals for deployment"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending Review</p>
                <h4 className="text-2xl font-bold text-amber-600 mt-0.5">{countPending}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Awaiting SuperAdmin action</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Provisioned Fleet</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-0.5">{countProvisioned}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Approved &amp; active</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Proposals</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{proposals.length}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">All lifecycle submissions</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Server className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rejected</p>
                <h4 className="text-2xl font-bold text-rose-600 mt-0.5">{countRejected}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Declined proposals</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filter and search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'pending_approval', label: `Pending (${countPending})` },
              { id: 'ALL', label: 'All Statuses' },
              { id: 'provisioned', label: 'Provisioned' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'draft', label: 'Draft' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  statusFilter === st.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-3 pr-3 text-xs rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-slate-400 text-slate-900"
            />
          </div>
        </div>

        {/* Approvals Table */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Server className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Proposals for Review ({filteredProposals.length})
                </h3>
                <p className="text-[11px] text-slate-500">Router configuration approvals</p>
              </div>
            </div>
          </CardHeader>
        <CardBody className="p-0">
          {isError ? (
            <div className="p-8 text-center text-critical flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              <p className="text-sm font-medium">Failed to load router proposals</p>
              <p className="text-xs text-slate-500">{extractErrorMessage(error)}</p>
              <Button size="sm" variant="secondary" onClick={() => refetch()} className="mt-2">
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name & Identifier</Th>
                  <Th>Region (Circle / BA)</Th>
                  <Th>Router IP</Th>
                  <Th>CVLAN Range</Th>
                  <Th>Proposed At</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.length === 0 ? (
                  <EmptyRow
                    cols={7}
                    message={
                      searchQuery || statusFilter !== 'ALL'
                        ? 'No proposals matching the current filter.'
                        : 'No router proposals pending approval.'
                    }
                  />
                ) : (
                  filteredProposals.map((proposal) => {
                    const circle = circleMap.get(proposal.circle_id)
                    const ba = baMap.get(proposal.ba_id)
                    const isPending = proposal.status === 'pending_approval'

                    return (
                      <tr
                        key={proposal.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isPending ? 'bg-warn/5' : ''
                        }`}
                      >
                        <Td>
                          <div className="font-semibold text-slate-900 text-[13px]">
                            {proposal.name}
                          </div>
                          <div className="font-mono text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Server className="h-3 w-3 text-slate-400" />
                            {proposal.identifier}
                            <span className="text-slate-500/40">•</span>
                            <span>ID #{proposal.proposed_instance_id}</span>
                          </div>
                        </Td>
                        <Td>
                          <div className="text-xs font-medium text-slate-900">
                            {circle ? `${circle.name} (${circle.code})` : `Circle #${proposal.circle_id}`}
                          </div>
                          <div className="text-xs text-slate-500">
                            {ba ? `${ba.name} (${ba.code})` : `BA #${proposal.ba_id}`}
                          </div>
                        </Td>
                        <Td>
                          <div className="font-mono text-xs text-slate-900">
                            {proposal.vyos_ip}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            Mgmt: {proposal.vyos_management_ip}
                          </div>
                        </Td>
                        <Td>
                          <span className="font-mono text-xs">
                            {proposal.cvlan_start && proposal.cvlan_end
                              ? `${proposal.cvlan_start} – ${proposal.cvlan_end}`
                              : 'Unset'}
                          </span>
                        </Td>
                        <Td>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(proposal.proposed_at).toLocaleDateString()}
                          </div>
                        </Td>
                        <Td>{formatStatusBadge(proposal.status)}</Td>
                        <Td className="text-right">
                          <Button
                            size="sm"
                            variant={isPending ? 'primary' : 'secondary'}
                            onClick={() => setSelectedProposal(proposal)}
                            className="px-2.5 py-1 h-7 text-xs gap-1"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>View & Act</span>
                          </Button>
                        </Td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Detail & Action Modal Panel */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedProposal.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedProposal.identifier} (ID #{selectedProposal.proposed_instance_id})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {formatStatusBadge(selectedProposal.status)}
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => handleOpenEdit(selectedProposal)}
                  className="gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                >
                  <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Edit Proposal</span>
                </Button>
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Proposal Status Feedback */}
              {selectedProposal.rejection_reason && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Rejection Reason:</span>{' '}
                    {selectedProposal.rejection_reason}
                  </div>
                </div>
              )}

              {selectedProposal.noc_return_notes && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Return Notes:</span>{' '}
                    {selectedProposal.noc_return_notes}
                  </div>
                </div>
              )}

              {/* Regional Scope */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" /> Regional Scope
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Circle:</span>
                    <span className="font-semibold text-slate-900">
                      {circleMap.get(selectedProposal.circle_id)?.name || `ID #${selectedProposal.circle_id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Business Area:</span>
                    <span className="font-semibold text-slate-900">
                      {baMap.get(selectedProposal.ba_id)?.name || `ID #${selectedProposal.ba_id}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Network Configuration */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Network Specifications
                </h4>
                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">VyOS Router IP:</span>
                    <span className="font-mono font-medium text-slate-900">
                      {selectedProposal.vyos_ip}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Management IP:</span>
                    <span className="font-mono font-medium text-slate-900">
                      {selectedProposal.vyos_management_ip}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">NAS Identifier:</span>
                    <span className="font-mono text-slate-900 font-medium">
                      {selectedProposal.nas_identifier}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">WAN Interface:</span>
                    <span className="font-mono text-slate-900">
                      {selectedProposal.wan_interface}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Max Bandwidth:</span>
                    <span className="font-medium text-slate-900">
                      {selectedProposal.wan_max_bandwidth}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">CVLAN Range:</span>
                    <span className="font-mono text-slate-900">
                      {selectedProposal.cvlan_start && selectedProposal.cvlan_end
                        ? `${selectedProposal.cvlan_start} – ${selectedProposal.cvlan_end}`
                        : 'Unset'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authentication & Access */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Authentication & Credentials
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">SSH User & Port:</span>
                    <span className="font-mono text-slate-900">
                      {selectedProposal.ssh_username}:{selectedProposal.ssh_port}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">VyOS API Endpoint:</span>
                    <span className="font-mono text-slate-900">
                      {selectedProposal.api_endpoint || 'None specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">API Key Status:</span>
                    <span className="text-slate-900 flex items-center gap-1">
                      {selectedProposal.has_api_key ? (
                        <span className="text-healthy flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Encrypted & Stored
                        </span>
                      ) : (
                        <span className="text-slate-500">None provided</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">SSH Password Status:</span>
                    <span className="text-slate-900 flex items-center gap-1">
                      {selectedProposal.has_ssh_password ? (
                        <span className="text-healthy flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Encrypted & Stored
                        </span>
                      ) : (
                        <span className="text-slate-500">None provided</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Timestamps & Instance ID */}
              {selectedProposal.status === 'provisioned' && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-healthy" /> Provisioning Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Captive Instance ID:</span>
                      <span className="font-mono font-bold text-healthy">
                        #{selectedProposal.captive_instance_id || selectedProposal.proposed_instance_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Provisioned At:</span>
                      <span className="font-mono text-slate-900">
                        {selectedProposal.provisioned_at
                          ? new Date(selectedProposal.provisioned_at).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submission & Review Audit */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Submission & Review Audit
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Proposed By:</span>
                    <span className="font-medium text-slate-900">
                      User #{selectedProposal.proposed_by_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Proposed At:</span>
                    <span className="font-mono text-slate-900">
                      {new Date(selectedProposal.proposed_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedProposal.reviewed_by_id && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">Reviewed By:</span>
                      <span className="font-medium text-slate-900">
                        User #{selectedProposal.reviewed_by_id}
                      </span>
                    </div>
                  )}
                  {selectedProposal.reviewed_at && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">Reviewed At:</span>
                      <span className="font-mono text-slate-900">
                        {new Date(selectedProposal.reviewed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedProposal.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    NOC Notes
                  </h4>
                  <p className="text-xs text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {selectedProposal.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedProposal(null)}>
                  Close
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(selectedProposal)}
                  className="gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                >
                  <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                  Edit Proposal
                </Button>
              </div>

              {selectedProposal.status === 'pending_approval' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setRejectionReason('')
                      setIsRejectOpen(true)
                    }}
                    className="gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setReturnNotes('')
                      setIsReturnOpen(true)
                    }}
                    className="gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                  >
                    <RotateCcw className="h-4 w-4 text-amber-600" />
                    Return for Revision
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenApprove(selectedProposal)}
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve & Provision
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 1. APPROVE & PROVISION MODAL ── */}
      {isApproveOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Approve & Provision Router
                </h3>
              </div>
              <button
                onClick={() => setIsApproveOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Warning notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This will register and provision the router instance in the captive portal and database.
                  You can verify or customize the Router Name and Instance ID below prior to approval.
                </span>
              </div>

              {/* Super Admin Identity Override */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-blue-600" />
                    Router Identity & Configuration
                  </h4>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Super Admin Override</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Router Name *"
                    placeholder="e.g. VyOS-East-Core-01"
                    value={approveName}
                    onChange={(e) => setApproveName(e.target.value)}
                    hint="Display name in fleet"
                  />
                  <Input
                    label="Instance ID *"
                    type="number"
                    placeholder="e.g. 1"
                    value={approveInstanceId}
                    onChange={(e) => setApproveInstanceId(e.target.value)}
                    hint="Captive portal ID"
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Router Identifier *"
                      placeholder="e.g. vyos-east-core-01"
                      value={approveIdentifier}
                      onChange={(e) => setApproveIdentifier(e.target.value)}
                      hint="Slug identifier (lowercase alphanumeric & hyphens)"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">Database DSN Configuration</span>
                    <span className="text-[10px] text-slate-500 font-medium">(Optional — defaults to central DB)</span>
                  </div>
                  <div className="space-y-2.5">
                    <Input
                      label="Captive DB DSN (Optional)"
                      placeholder="Optional, leave blank to use central DB"
                      value={captiveDbDsn}
                      onChange={(e) => setCaptiveDbDsn(e.target.value)}
                      hint="Custom PostgreSQL DSN for captive portal (if overriding default DB)"
                    />

                    <Input
                      label="NAT Logging DB DSN (Optional)"
                      placeholder="Optional, leave blank to use central DB"
                      value={natDbDsn}
                      onChange={(e) => setNatDbDsn(e.target.value)}
                      hint="Custom PostgreSQL DSN for NAT logging (if overriding default DB)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsApproveOpen(false)}
                disabled={approveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={
                  !approveName.trim() ||
                  !approveInstanceId ||
                  approveMutation.isPending
                }
                loading={approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate({
                    id: selectedProposal.id,
                    captive_db_dsn: captiveDbDsn.trim() || undefined,
                    nat_db_dsn: natDbDsn.trim() || undefined,
                    name: approveName.trim() || undefined,
                    proposed_instance_id: approveInstanceId ? Number(approveInstanceId) : undefined,
                    identifier: approveIdentifier.trim() || undefined,
                  })
                }
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve & Activate in DB
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROPOSAL MODAL (Super Admin) ── */}
      {isEditOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Edit Router Proposal #{selectedProposal.id}
                </h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    As Super Admin, you can modify the proposal identifier, name, instance ID, and network parameters directly.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Router Name *"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Proposed Instance ID *"
                    type="number"
                    value={editForm.proposed_instance_id}
                    onChange={(e) => setEditForm({ ...editForm, proposed_instance_id: e.target.value })}
                    required
                  />
                  <Input
                    label="Router Identifier *"
                    value={editForm.identifier}
                    onChange={(e) => setEditForm({ ...editForm, identifier: e.target.value })}
                    required
                  />
                  <Input
                    label="NAS Identifier *"
                    value={editForm.nas_identifier}
                    onChange={(e) => setEditForm({ ...editForm, nas_identifier: e.target.value })}
                    required
                  />
                  <Input
                    label="VyOS Router IP *"
                    value={editForm.vyos_ip}
                    onChange={(e) => setEditForm({ ...editForm, vyos_ip: e.target.value })}
                    required
                  />
                  <Input
                    label="Management IP *"
                    value={editForm.vyos_management_ip}
                    onChange={(e) => setEditForm({ ...editForm, vyos_management_ip: e.target.value })}
                    required
                  />
                  <Input
                    label="WAN Interface"
                    value={editForm.wan_interface}
                    onChange={(e) => setEditForm({ ...editForm, wan_interface: e.target.value })}
                  />
                  <Input
                    label="WAN Max Bandwidth"
                    value={editForm.wan_max_bandwidth}
                    onChange={(e) => setEditForm({ ...editForm, wan_max_bandwidth: e.target.value })}
                  />
                  <Input
                    label="CVLAN Start"
                    type="number"
                    value={editForm.cvlan_start}
                    onChange={(e) => setEditForm({ ...editForm, cvlan_start: e.target.value })}
                  />
                  <Input
                    label="CVLAN End"
                    type="number"
                    value={editForm.cvlan_end}
                    onChange={(e) => setEditForm({ ...editForm, cvlan_end: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Operational Notes
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-primary placeholder:text-slate-400 font-sans"
                    placeholder="Additional administrative notes..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={updateMutation.isPending}
                  className="gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. REJECT MODAL ── */}
      {isRejectOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Reject Router Proposal
                </h3>
              </div>
              <button
                onClick={() => setIsRejectOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Please provide the reason for rejecting proposal &quot;{selectedProposal.name}&quot;.
                This will be recorded and visible to the NOC admin.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Duplicate IP allocation or missing WAN gateway connectivity..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-primary placeholder:text-slate-400 font-sans"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsRejectOpen(false)}
                disabled={rejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                loading={rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    id: selectedProposal.id,
                    reason: rejectionReason.trim(),
                  })
                }
                className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <XCircle className="h-4 w-4" />
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. RETURN FOR REVISION MODAL ── */}
      {isReturnOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Return Proposal for Revision
                </h3>
              </div>
              <button
                onClick={() => setIsReturnOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Returning proposal &quot;{selectedProposal.name}&quot; will change its status back to draft,
                allowing the NOC Admin to update configuration and re-submit.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Revision Notes for NOC Admin *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please change the WAN bandwidth to 1gbit and verify SVLAN allocation..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-primary placeholder:text-slate-400 font-sans"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReturnOpen(false)}
                disabled={returnMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!returnNotes.trim() || returnMutation.isPending}
                loading={returnMutation.isPending}
                onClick={() =>
                  returnMutation.mutate({
                    id: selectedProposal.id,
                    notes: returnNotes.trim(),
                  })
                }
                className="gap-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
              >
                <RotateCcw className="h-4 w-4 text-amber-600" />
                Return to NOC Admin
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

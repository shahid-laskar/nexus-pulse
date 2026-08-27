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
import type { RouterProposal, RouterProposalStatus } from '@/types'

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

  // Form Fields State
  const [captiveDbDsn, setCaptiveDbDsn] = useState<string>('')
  const [natDbDsn, setNatDbDsn] = useState<string>('')
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [returnNotes, setReturnNotes] = useState<string>('')

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

  // 3. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, captive_db_dsn, nat_db_dsn }: { id: number; captive_db_dsn: string; nat_db_dsn: string }) =>
      nocApi.approveRouterProposal(id, { captive_db_dsn, nat_db_dsn }),
    onSuccess: (updated) => {
      toast.success(`Router "${updated.name}" approved & provisioned successfully`)
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

  // 4. Reject Mutation
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

  // 5. Return Mutation
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Router Approvals"
        subtitle="Review, approve, reject, or return edge router provisioning proposals"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Filter and stats bar */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'pending_approval', label: `Pending Approval (${pendingCount})` },
                { id: 'ALL', label: 'All Statuses' },
                { id: 'provisioned', label: 'Provisioned' },
                { id: 'rejected', label: 'Rejected' },
                { id: 'draft', label: 'Draft' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                    statusFilter === st.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-2/80'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="w-full md:w-64">
              <input
                type="text"
                placeholder="Search router proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-hairline bg-surface-2 outline-none focus:border-primary text-foreground"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Approvals Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">
              Router Proposals ({filteredProposals.length})
            </h3>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isError ? (
            <div className="p-8 text-center text-critical flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              <p className="text-sm font-medium">Failed to load router proposals</p>
              <p className="text-xs text-muted-foreground">{extractErrorMessage(error)}</p>
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
                        className={`hover:bg-surface-2/40 transition-colors ${
                          isPending ? 'bg-warn/5' : ''
                        }`}
                      >
                        <Td>
                          <div className="font-semibold text-foreground text-[13px]">
                            {proposal.name}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Server className="h-3 w-3 text-muted-foreground/70" />
                            {proposal.identifier}
                            <span className="text-muted-foreground/40">•</span>
                            <span>ID #{proposal.proposed_instance_id}</span>
                          </div>
                        </Td>
                        <Td>
                          <div className="text-xs font-medium text-foreground">
                            {circle ? `${circle.name} (${circle.code})` : `Circle #${proposal.circle_id}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ba ? `${ba.name} (${ba.code})` : `BA #${proposal.ba_id}`}
                          </div>
                        </Td>
                        <Td>
                          <div className="font-mono text-xs text-foreground">
                            {proposal.vyos_ip}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
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
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-hairline shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-2/50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground text-base">
                    {selectedProposal.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedProposal.identifier} (ID #{selectedProposal.proposed_instance_id})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {formatStatusBadge(selectedProposal.status)}
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="text-muted-foreground hover:text-foreground text-lg px-2 py-0.5 rounded"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Proposal Status Feedback */}
              {selectedProposal.rejection_reason && (
                <div className="p-3 bg-critical/10 border border-critical/20 rounded-lg text-xs text-critical flex items-start gap-2">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Rejection Reason:</span>{' '}
                    {selectedProposal.rejection_reason}
                  </div>
                </div>
              )}

              {selectedProposal.noc_return_notes && (
                <div className="p-3 bg-warn/10 border border-warn/20 rounded-lg text-xs text-warn flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Return Notes:</span>{' '}
                    {selectedProposal.noc_return_notes}
                  </div>
                </div>
              )}

              {/* Regional Scope */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" /> Regional Scope
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface-2/40 p-3 rounded-lg border border-hairline">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Circle:</span>
                    <span className="font-semibold text-foreground">
                      {circleMap.get(selectedProposal.circle_id)?.name || `ID #${selectedProposal.circle_id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Business Area:</span>
                    <span className="font-semibold text-foreground">
                      {baMap.get(selectedProposal.ba_id)?.name || `ID #${selectedProposal.ba_id}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Network Configuration */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Network Specifications
                </h4>
                <div className="grid grid-cols-3 gap-3 text-xs bg-surface-2/40 p-3 rounded-lg border border-hairline">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">VyOS Router IP:</span>
                    <span className="font-mono font-medium text-foreground">
                      {selectedProposal.vyos_ip}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Management IP:</span>
                    <span className="font-mono font-medium text-foreground">
                      {selectedProposal.vyos_management_ip}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">NAS Identifier:</span>
                    <span className="font-mono text-foreground font-medium">
                      {selectedProposal.nas_identifier}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">WAN Interface:</span>
                    <span className="font-mono text-foreground">
                      {selectedProposal.wan_interface}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Max Bandwidth:</span>
                    <span className="font-medium text-foreground">
                      {selectedProposal.wan_max_bandwidth}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">CVLAN Range:</span>
                    <span className="font-mono text-foreground">
                      {selectedProposal.cvlan_start && selectedProposal.cvlan_end
                        ? `${selectedProposal.cvlan_start} – ${selectedProposal.cvlan_end}`
                        : 'Unset'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authentication & Access */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Authentication & Credentials
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface-2/40 p-3 rounded-lg border border-hairline">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">SSH User & Port:</span>
                    <span className="font-mono text-foreground">
                      {selectedProposal.ssh_username}:{selectedProposal.ssh_port}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">VyOS API Endpoint:</span>
                    <span className="font-mono text-foreground">
                      {selectedProposal.api_endpoint || 'None specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">API Key Status:</span>
                    <span className="text-foreground flex items-center gap-1">
                      {selectedProposal.has_api_key ? (
                        <span className="text-healthy flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Encrypted & Stored
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None provided</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">SSH Password Status:</span>
                    <span className="text-foreground flex items-center gap-1">
                      {selectedProposal.has_ssh_password ? (
                        <span className="text-healthy flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Encrypted & Stored
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None provided</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Timestamps & Instance ID */}
              {selectedProposal.status === 'provisioned' && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-healthy" /> Provisioning Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-surface-2/40 p-3 rounded-lg border border-hairline">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Captive Instance ID:</span>
                      <span className="font-mono font-bold text-healthy">
                        #{selectedProposal.captive_instance_id || selectedProposal.proposed_instance_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Provisioned At:</span>
                      <span className="font-mono text-foreground">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Submission & Review Audit
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface-2/40 p-3 rounded-lg border border-hairline">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Proposed By:</span>
                    <span className="font-medium text-foreground">
                      User #{selectedProposal.proposed_by_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Proposed At:</span>
                    <span className="font-mono text-foreground">
                      {new Date(selectedProposal.proposed_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedProposal.reviewed_by_id && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Reviewed By:</span>
                      <span className="font-medium text-foreground">
                        User #{selectedProposal.reviewed_by_id}
                      </span>
                    </div>
                  )}
                  {selectedProposal.reviewed_at && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Reviewed At:</span>
                      <span className="font-mono text-foreground">
                        {new Date(selectedProposal.reviewed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedProposal.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    NOC Notes
                  </h4>
                  <p className="text-xs text-foreground bg-surface-2/40 p-3 rounded-lg border border-hairline whitespace-pre-wrap">
                    {selectedProposal.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="px-6 py-3 border-t border-hairline bg-surface-2/50 flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setSelectedProposal(null)}>
                Close
              </Button>

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
                    className="gap-1 text-warn border-warn/30 hover:bg-warn/10"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return for Revision
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCaptiveDbDsn('')
                      setNatDbDsn('')
                      setIsApproveOpen(true)
                    }}
                    className="gap-1 bg-healthy hover:bg-healthy/90 text-healthy-foreground"
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
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-hairline shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-hairline bg-healthy/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-healthy" />
                <h3 className="font-bold text-foreground text-sm">
                  Approve & Provision Router
                </h3>
              </div>
              <button
                onClick={() => setIsApproveOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg px-2 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Warning notice */}
              <div className="p-3 bg-warn/10 border border-warn/20 rounded-lg text-xs text-warn flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  This will immediately call the captive portal to create the router instance #{selectedProposal.proposed_instance_id}.
                  Ensure both DSNs are correct and the router is reachable before proceeding.
                </span>
              </div>

              <div className="space-y-3">
                <Input
                  label="Captive DB DSN *"
                  placeholder="postgresql://user:pass@127.0.0.1:5432/captive_db"
                  value={captiveDbDsn}
                  onChange={(e) => setCaptiveDbDsn(e.target.value)}
                  hint="PostgreSQL DSN for captive portal DB for this instance"
                />

                <Input
                  label="NAT Logging DB DSN *"
                  placeholder="postgresql://user:pass@127.0.0.1:5432/nat_db"
                  value={natDbDsn}
                  onChange={(e) => setNatDbDsn(e.target.value)}
                  hint="PostgreSQL DSN for NAT logging DB for this instance"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-hairline bg-surface-2/50 flex justify-end gap-2">
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
                  !captiveDbDsn.trim() ||
                  !natDbDsn.trim() ||
                  approveMutation.isPending
                }
                isLoading={approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate({
                    id: selectedProposal.id,
                    captive_db_dsn: captiveDbDsn.trim(),
                    nat_db_dsn: natDbDsn.trim(),
                  })
                }
                className="gap-1.5 bg-healthy hover:bg-healthy/90 text-healthy-foreground"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Provision
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. REJECT MODAL ── */}
      {isRejectOpen && selectedProposal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-hairline shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-hairline bg-critical/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-critical" />
                <h3 className="font-bold text-foreground text-sm">
                  Reject Router Proposal
                </h3>
              </div>
              <button
                onClick={() => setIsRejectOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg px-2 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                Please provide the reason for rejecting proposal &quot;{selectedProposal.name}&quot;.
                This will be recorded and visible to the NOC admin.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Duplicate IP allocation or missing WAN gateway connectivity..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-hairline bg-surface text-foreground outline-none focus:border-critical placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-hairline bg-surface-2/50 flex justify-end gap-2">
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
                isLoading={rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    id: selectedProposal.id,
                    reason: rejectionReason.trim(),
                  })
                }
                className="gap-1.5"
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
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-hairline shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-hairline bg-warn/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-warn" />
                <h3 className="font-bold text-foreground text-sm">
                  Return Proposal for Revision
                </h3>
              </div>
              <button
                onClick={() => setIsReturnOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg px-2 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                Returning proposal &quot;{selectedProposal.name}&quot; will change its status back to draft,
                allowing the NOC Admin to update configuration and re-submit.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Revision Notes for NOC Admin *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please change the WAN bandwidth to 1gbit and verify SVLAN allocation..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-hairline bg-surface text-foreground outline-none focus:border-warn placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-hairline bg-surface-2/50 flex justify-end gap-2">
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
                isLoading={returnMutation.isPending}
                onClick={() =>
                  returnMutation.mutate({
                    id: selectedProposal.id,
                    notes: returnNotes.trim(),
                  })
                }
                className="gap-1.5 text-warn border-warn/30 hover:bg-warn/10"
              >
                <RotateCcw className="h-4 w-4" />
                Return to NOC Admin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

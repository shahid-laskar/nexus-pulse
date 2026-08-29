import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Router as RouterIcon,
  Plus,
  Eye,
  Edit2,
  Send,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Server,
  ShieldCheck,
  Globe,
} from 'lucide-react'
import { nocApi } from '@/api/noc'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/store/auth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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

export function RouterProposalsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const navigate = useNavigate()
  const { isNOC } = useAuthStore()
  const qc = useQueryClient()

  const [selectedProposal, setSelectedProposal] = useState<RouterProposal | null>(null)
  const [submittingProposal, setSubmittingProposal] = useState<RouterProposal | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

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

  const submitMutation = useMutation({
    mutationFn: (id: number) => nocApi.submitRouterProposal(id),
    onSuccess: (updated) => {
      toast.success(`Proposal "${updated.name}" submitted for approval`)
      qc.invalidateQueries({ queryKey: ['noc-router-proposals'] })
      setSubmittingProposal(null)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || 'Failed to submit proposal')
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

  if (isLoading) {
    return <PageLoader />
  }

  const countDraft = proposals.filter((p) => p.status === 'draft').length
  const countPending = proposals.filter((p) => p.status === 'pending_approval').length
  const countProvisioned = proposals.filter((p) => p.status === 'provisioned').length
  const countRejected = proposals.filter((p) => p.status === 'rejected').length

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Router Proposals"
        subtitle="Manage and track VyOS edge router provisioning proposals, approval status, and network parameters"
        actions={
          <div className="flex items-center gap-2">
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
            {isNOC && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/noc/router-proposals/new')}
                className="gap-1.5 h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                New Proposal
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Proposals</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{proposals.length}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Submitted edge routers</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Server className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending Approval</p>
                <h4 className="text-2xl font-bold text-amber-600 mt-0.5">{countPending}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Awaiting SuperAdmin review</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Provisioned</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-0.5">{countProvisioned}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Active in fleet</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Drafts</p>
                <h4 className="text-2xl font-bold text-slate-600 mt-0.5">{countDraft}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Unsubmitted configurations</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Edit2 className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filter and search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Proposals' },
              { id: 'pending_approval', label: `Pending (${countPending})` },
              { id: 'provisioned', label: 'Provisioned' },
              { id: 'draft', label: 'Draft' },
              { id: 'rejected', label: 'Rejected' },
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
              placeholder="Search router proposals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-3 pr-3 text-xs rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-slate-400 text-slate-900"
            />
          </div>
        </div>

        {/* Proposals table */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Server className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Router Fleet Proposals ({filteredProposals.length})
                </h3>
                <p className="text-[11px] text-slate-500">Edge router configurations &amp; lifecycle state</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {isError ? (
              <div className="p-8 text-center text-rose-600 flex flex-col items-center gap-2">
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
                    <Th>Name &amp; Identifier</Th>
                    <Th>Router IP</Th>
                    <Th>Instance ID</Th>
                    <Th>Status</Th>
                    <Th>Proposed At</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProposals.length === 0 ? (
                    <EmptyRow
                      cols={6}
                      message={
                        searchQuery || statusFilter !== 'ALL'
                          ? 'No router proposals match the current filter.'
                          : 'No router proposals submitted yet.'
                      }
                    />
                  ) : (
                    filteredProposals.map((proposal) => {
                      const isDraft = proposal.status === 'draft'
                      const isReturned =
                        proposal.status === 'pending_approval' && Boolean(proposal.noc_return_notes)
                      const canEdit = isDraft || isReturned

                      return (
                        <tr key={proposal.id} className="hover:bg-slate-50/70 transition-colors">
                        <Td>
                          <div className="font-semibold text-slate-900 text-[13px]">
                            {proposal.name}
                          </div>
                          <div className="font-mono text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Server className="h-3 w-3 text-slate-400" />
                            {proposal.identifier}
                          </div>
                          {proposal.noc_return_notes && (
                            <div className="text-[11px] text-warn mt-1 bg-warn/10 px-2 py-0.5 rounded border border-warn/20 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span>Revision requested: {proposal.noc_return_notes}</span>
                            </div>
                          )}
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
                          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                            ID #{proposal.proposed_instance_id}
                          </span>
                        </Td>
                        <Td>{formatStatusBadge(proposal.status)}</Td>
                        <Td>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(proposal.proposed_at).toLocaleDateString()}
                          </div>
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedProposal(proposal)}
                              title="View Details"
                              className="px-2 py-1 h-7 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="sr-only">View</span>
                            </Button>

                            {canEdit && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  navigate(`/noc/router-proposals/${proposal.id}/edit`)
                                }
                                title="Edit Draft"
                                className="px-2 py-1 h-7 text-xs"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-primary" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            )}

                            {isDraft && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setSubmittingProposal(proposal)}
                                title="Submit for Approval"
                                className="px-2 py-1 h-7 text-xs gap-1"
                              >
                                <Send className="h-3 w-3" />
                                <span>Submit</span>
                              </Button>
                            )}
                          </div>
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

      {/* Detail Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2.5">
                <RouterIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedProposal.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedProposal.identifier}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {formatStatusBadge(selectedProposal.status)}
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
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
                    <span className="font-semibold">Notes from Super Admin:</span>{' '}
                    {selectedProposal.noc_return_notes}
                  </div>
                </div>
              )}

              {/* Network Specifications */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" /> Network Specifications
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
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
                  <div>
                    <span className="text-slate-500 block text-[11px]">Instance ID:</span>
                    <span className="font-mono text-slate-900">
                      #{selectedProposal.proposed_instance_id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authentication & Access */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Authentication & Secrets
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">NAS Identifier:</span>
                    <span className="font-mono font-medium text-slate-900">
                      {selectedProposal.nas_identifier}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">SSH Username & Port:</span>
                    <span className="font-mono text-slate-900">
                      {selectedProposal.ssh_username}:{selectedProposal.ssh_port}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">API Key Configured:</span>
                    <span className="text-slate-900 flex items-center gap-1">
                      {selectedProposal.has_api_key ? (
                        <span className="text-healthy flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Encrypted & Stored
                        </span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">SSH Password Configured:</span>
                    <span className="text-slate-900 flex items-center gap-1">
                      {selectedProposal.has_ssh_password ? (
                        <span className="text-healthy flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Encrypted & Stored
                        </span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedProposal.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Notes
                  </h4>
                  <p className="text-xs text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {selectedProposal.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedProposal(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Submission */}
      {submittingProposal && (
        <ConfirmDialog
          isOpen={true}
          title="Submit Router Proposal"
          description={`Are you sure you want to submit "${submittingProposal.name}" (${submittingProposal.identifier}) for Super Admin review? Once submitted, it cannot be edited unless returned for revision.`}
          confirmText="Submit Proposal"
          variant="primary"
          isLoading={submitMutation.isPending}
          onConfirm={() => submitMutation.mutate(submittingProposal.id)}
          onClose={() => setSubmittingProposal(null)}
        />
      )}
      </div>
    </div>
  )
}

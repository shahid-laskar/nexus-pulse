import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  FileDiff,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Eye,
  ArrowRight,
  Send,
  Building,
  User,
  Sliders,
  Palette,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
  Code2,
  Info,
  X,
} from 'lucide-react'
import { nocApi } from '@/api/noc'
import { customersApi } from '@/api/master-data'
import { extractErrorMessage } from '@/lib/axios'
import { Button } from '@/components/ui/Button'
import { Badge, ChangeRequestStatusBadge, ChangeRequestTypeBadge } from '@/components/ui/Badge'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import type {
  ChangeRequest,
  ChangeRequestStatus,
  ChangeRequestType,
  CustomerRead,
} from '@/types'

const FIELD_LABELS: Record<string, string> = {
  primary_color: 'Primary Color',
  secondary_color: 'Secondary Color',
  welcome_message: 'Welcome Message',
  terms_url: 'Terms of Service URL',
  portal_domain: 'Portal Domain',
  portal_entry_mode: 'Portal Entry Mode',
  session_timeout: 'Session Timeout (seconds)',
  idle_timeout: 'Idle Timeout (seconds)',
  max_concurrent_sessions: 'Max Concurrent Sessions',
  daily_data_limit_mb: 'Daily Data Limit (MB)',
  data_limit_mb: 'Total Data Limit (MB)',
  total_users: 'Total User Allocation',
  approval_otp_validity_minutes: 'Approval OTP Validity (mins)',
  enable_password_login: 'Password Login',
  enable_otp_login: 'OTP Login',
  registration_approval_mode: 'Registration Approval Mode',
  mac_binding: 'MAC Binding',
  enable_mac_whitelist: 'MAC Whitelisting',
  max_bandwidth: 'WAN Maximum Bandwidth',
  wan_interface: 'WAN Interface',
  qos_interface: 'QoS Interface',
}

interface ChangeRequestsInboxProps {
  onCustomerSelect?: (customerId: number) => void
  embedded?: boolean
}

export function ChangeRequestsInbox({ onCustomerSelect, embedded = false }: ChangeRequestsInboxProps) {
  const qc = useQueryClient()

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modals & Selected Request
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null)
  const [isDiffOpen, setIsDiffOpen] = useState<boolean>(false)
  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false)
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false)
  const [isReturnOpen, setIsReturnOpen] = useState<boolean>(false)

  // Review Form States
  const [reviewNotes, setReviewNotes] = useState<string>('')
  const [reviewNotesError, setReviewNotesError] = useState<string>('')

  // 1. Fetch Change Requests
  const {
    data: changeRequests = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['noc-change-requests'],
    queryFn: () => nocApi.listChangeRequests(),
    staleTime: 10_000,
  })

  // 2. Fetch Customers Map for company names and current settings
  const { data: customersResponse } = useQuery({
    queryKey: ['master-customers-lookup'],
    queryFn: () => customersApi.list({ limit: 500 }),
    staleTime: 60_000,
  })

  const customerMap = new Map<number, CustomerRead>(
    (customersResponse?.customers || []).map((c) => [c.id, c])
  )

  // 3. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (reqId: number) => nocApi.approveChangeRequest(reqId),
    onSuccess: (updated) => {
      toast.success(`Change request #${updated.id} approved and applied to router!`)
      qc.invalidateQueries({ queryKey: ['noc-change-requests'] })
      setIsApproveOpen(false)
      setIsDiffOpen(false)
      setSelectedRequest(null)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || 'Failed to approve and apply change request')
    },
  })

  // 4. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ reqId, noc_notes }: { reqId: number; noc_notes: string }) =>
      nocApi.rejectChangeRequest(reqId, { noc_notes }),
    onSuccess: (updated) => {
      toast.success(`Change request #${updated.id} rejected`)
      qc.invalidateQueries({ queryKey: ['noc-change-requests'] })
      setIsRejectOpen(false)
      setIsDiffOpen(false)
      setSelectedRequest(null)
      setReviewNotes('')
      setReviewNotesError('')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || 'Failed to reject change request')
    },
  })

  // 5. Return Mutation
  const returnMutation = useMutation({
    mutationFn: ({ reqId, noc_notes }: { reqId: number; noc_notes: string }) =>
      nocApi.returnChangeRequest(reqId, { noc_notes }),
    onSuccess: (updated) => {
      toast.success(`Change request #${updated.id} returned for clarification`)
      qc.invalidateQueries({ queryKey: ['noc-change-requests'] })
      setIsReturnOpen(false)
      setIsDiffOpen(false)
      setSelectedRequest(null)
      setReviewNotes('')
      setReviewNotesError('')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || 'Failed to return change request')
    },
  })

  // Filter and Search
  const filteredRequests = changeRequests.filter((req) => {
    const matchesStatus =
      statusFilter === 'ALL' || req.status === statusFilter
    const matchesType =
      typeFilter === 'ALL' || req.request_type === typeFilter

    const q = searchQuery.toLowerCase().trim()
    const customer = customerMap.get(req.customer_id)
    const companyName = customer?.company_name?.toLowerCase() || ''
    const payloadStr = JSON.stringify(req.payload).toLowerCase()
    const ebNotes = req.eb_notes.toLowerCase()
    const nocNotes = (req.noc_notes || '').toLowerCase()

    const matchesSearch =
      !q ||
      req.id.toString().includes(q) ||
      req.customer_id.toString().includes(q) ||
      companyName.includes(q) ||
      req.request_type.toLowerCase().includes(q) ||
      ebNotes.includes(q) ||
      nocNotes.includes(q) ||
      payloadStr.includes(q)

    return matchesStatus && matchesType && matchesSearch
  })

  // Quick Counts
  const counts = {
    all: changeRequests.length,
    pending: changeRequests.filter((r) => r.status === 'PENDING').length,
    in_review: changeRequests.filter((r) => r.status === 'IN_REVIEW').length,
    needs_info: changeRequests.filter((r) => r.status === 'NEEDS_INFO').length,
    applied: changeRequests.filter((r) => r.status === 'APPLIED').length,
    rejected: changeRequests.filter((r) => r.status === 'REJECTED').length,
  }

  const handleOpenDiff = (request: ChangeRequest) => {
    setSelectedRequest(request)
    setIsDiffOpen(true)
  }

  const handleOpenApprove = (request: ChangeRequest) => {
    setSelectedRequest(request)
    setIsApproveOpen(true)
  }

  const handleOpenReject = (request: ChangeRequest) => {
    setSelectedRequest(request)
    setReviewNotes('')
    setReviewNotesError('')
    setIsRejectOpen(true)
  }

  const handleOpenReturn = (request: ChangeRequest) => {
    setSelectedRequest(request)
    setReviewNotes('')
    setReviewNotesError('')
    setIsReturnOpen(true)
  }

  const handleConfirmReject = () => {
    if (!selectedRequest) return
    if (reviewNotes.trim().length < 5) {
      setReviewNotesError('Rejection reason must be at least 5 characters long.')
      return
    }
    rejectMutation.mutate({
      reqId: selectedRequest.id,
      noc_notes: reviewNotes.trim(),
    })
  }

  const handleConfirmReturn = () => {
    if (!selectedRequest) return
    if (reviewNotes.trim().length < 5) {
      setReviewNotesError('Clarification notes must be at least 5 characters long.')
      return
    }
    returnMutation.mutate({
      reqId: selectedRequest.id,
      noc_notes: reviewNotes.trim(),
    })
  }

  if (isLoading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">Total Requests</div>
          <div className="text-2xl font-bold mt-1">{counts.all}</div>
        </button>

        <button
          onClick={() => setStatusFilter('PENDING')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 opacity-90 flex items-center justify-between">
            Pending Review
            {counts.pending > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-700">{counts.pending}</div>
        </button>

        <button
          onClick={() => setStatusFilter('IN_REVIEW')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            statusFilter === 'IN_REVIEW'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 opacity-90">In Review / Retrying</div>
          <div className="text-2xl font-bold mt-1 text-blue-700">{counts.in_review}</div>
        </button>

        <button
          onClick={() => setStatusFilter('NEEDS_INFO')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            statusFilter === 'NEEDS_INFO'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-600/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50/40'
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 opacity-90">Needs Info</div>
          <div className="text-2xl font-bold mt-1 text-purple-700">{counts.needs_info}</div>
        </button>

        <button
          onClick={() => setStatusFilter('APPLIED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            statusFilter === 'APPLIED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 opacity-90">Applied & Synced</div>
          <div className="text-2xl font-bold mt-1 text-emerald-700">{counts.applied}</div>
        </button>

        <button
          onClick={() => setStatusFilter('REJECTED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            statusFilter === 'REJECTED'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/40'
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 opacity-90">Rejected</div>
          <div className="text-2xl font-bold mt-1 text-rose-700">{counts.rejected}</div>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[240px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer, ID, notes..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-500">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="PORTAL_SETTINGS">Portal & Branding</option>
                <option value="SESSION_POLICY">Session & Quotas</option>
                <option value="BANDWIDTH_PROFILE">Bandwidth Profiles</option>
                <option value="AUTH_OPTIONS">Authentication</option>
                <option value="QOS">QoS & Interface</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Change Requests Table */}
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <Th className="w-20">Req #</Th>
                <Th>Target Customer</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th className="max-w-xs">EB Requester Rationale</Th>
                <Th>Submission Date</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <EmptyRow
                  cols={7}
                  message={
                    searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                      ? 'No change requests match your active filters.'
                      : 'No change requests found in the inbox.'
                  }
                />
              ) : (
                filteredRequests.map((req) => {
                  const customer = customerMap.get(req.customer_id)
                  const isPendingReview = req.status === 'PENDING' || req.status === 'IN_REVIEW'

                  return (
                    <tr
                      key={req.id}
                      className={cn(
                        'border-b border-slate-100 hover:bg-slate-50/80 transition-colors',
                        req.status === 'PENDING' && 'bg-amber-50/20'
                      )}
                    >
                      {/* ID */}
                      <Td className="font-mono text-xs font-bold text-slate-900">
                        #{req.id}
                      </Td>

                      {/* Customer */}
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 font-bold text-xs">
                            <Building className="w-3.5 h-3.5 text-slate-500" />
                          </span>
                          <div>
                            <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                              {customer?.company_name || `Customer #${req.customer_id}`}
                              {customer && (
                                <span className="text-[10px] text-slate-400 font-normal font-mono">
                                  (ID: {customer.id})
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-slate-400">
                              {customer?.location || customer?.user_account || 'Enterprise Customer'}
                            </div>
                          </div>
                        </div>
                      </Td>

                      {/* Request Type */}
                      <Td>
                        <ChangeRequestTypeBadge type={req.request_type} />
                      </Td>

                      {/* Status */}
                      <Td>
                        <ChangeRequestStatusBadge status={req.status} />
                      </Td>

                      {/* Requester Notes */}
                      <Td className="max-w-xs">
                        <p className="text-xs text-slate-600 truncate" title={req.eb_notes || 'No notes'}>
                          {req.eb_notes || <span className="text-slate-400 italic">No notes provided</span>}
                        </p>
                        {req.noc_notes && (
                          <p className="text-[11px] text-purple-700 truncate font-mono mt-0.5" title={`NOC: ${req.noc_notes}`}>
                            NOC: {req.noc_notes}
                          </p>
                        )}
                      </Td>

                      {/* Submission Date */}
                      <Td className="text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {req.requested_at ? new Date(req.requested_at).toLocaleDateString() : '—'}
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          {req.requested_at ? new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </Td>

                      {/* Actions */}
                      <Td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenDiff(req)}
                            className="gap-1 text-xs h-7.5 px-2.5 font-medium"
                          >
                            <FileDiff className="w-3.5 h-3.5 text-slate-500" />
                            Inspect Diff
                          </Button>

                          {isPendingReview && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenApprove(req)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-7.5 px-2 text-xs gap-1"
                                title="Approve & Apply to Router"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </Button>

                              <button
                                onClick={() => handleOpenReturn(req)}
                                title="Return for More Info"
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenReject(req)}
                                title="Reject Request"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Visual Diff & Inspection Modal */}
      {isDiffOpen && selectedRequest && (
        <VisualDiffModal
          request={selectedRequest}
          customer={customerMap.get(selectedRequest.customer_id) || null}
          isOpen={isDiffOpen}
          onClose={() => setIsDiffOpen(false)}
          onApprove={() => {
            setIsDiffOpen(false)
            setIsApproveOpen(true)
          }}
          onReject={() => {
            setIsDiffOpen(false)
            handleOpenReject(selectedRequest)
          }}
          onReturn={() => {
            setIsDiffOpen(false)
            handleOpenReturn(selectedRequest)
          }}
        />
      )}

      {/* Approve Confirmation Modal */}
      <ConfirmDialog
        isOpen={isApproveOpen}
        title={`Approve & Apply Change Request #${selectedRequest?.id}?`}
        description={
          <div className="space-y-3 text-left">
            <p>
              Are you sure you want to approve this{' '}
              <strong className="text-slate-900">
                {selectedRequest ? selectedRequest.request_type.replace(/_/g, ' ') : ''}
              </strong>{' '}
              change request for customer{' '}
              <strong className="text-slate-900">
                {customerMap.get(selectedRequest?.customer_id || 0)?.company_name || `#${selectedRequest?.customer_id}`}
              </strong>?
            </p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Live Router Synchronization:</strong> This will dispatch API updates directly to the captive portal proxy and synchronize the staging database immediately.
              </div>
            </div>
          </div>
        }
        confirmText="Approve & Apply Now"
        cancelText="Cancel"
        variant="primary"
        isLoading={approveMutation.isPending}
        onConfirm={() => {
          if (selectedRequest) {
            approveMutation.mutate(selectedRequest.id)
          }
        }}
        onClose={() => {
          setIsApproveOpen(false)
          setSelectedRequest(null)
        }}
      />

      {/* Reject Modal */}
      {isRejectOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-300" />
                <h3 className="text-base font-bold">Reject Change Request #{selectedRequest.id}</h3>
              </div>
              <button
                onClick={() => setIsRejectOpen(false)}
                className="text-rose-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Please specify the operational rationale for rejecting this configuration request. The EB administrator will be notified.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Rejection Reason (Required, min 5 characters)
                </label>
                <textarea
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => {
                    setReviewNotes(e.target.value)
                    if (reviewNotesError) setReviewNotesError('')
                  }}
                  placeholder="e.g. Bandwidth threshold exceeds subscriber policy limits for this circle..."
                  className={cn(
                    'w-full p-3 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-sans',
                    reviewNotesError
                      ? 'border-rose-400 ring-rose-200 bg-rose-50/20'
                      : 'border-slate-300 focus:ring-primary/20 focus:border-primary'
                  )}
                />
                {reviewNotesError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{reviewNotesError}</p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
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
                onClick={handleConfirmReject}
                isLoading={rejectMutation.isPending}
                className="gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return for Info Modal */}
      {isReturnOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-300" />
                <h3 className="text-base font-bold">Return for Clarification #{selectedRequest.id}</h3>
              </div>
              <button
                onClick={() => setIsReturnOpen(false)}
                className="text-purple-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Provide guidance on what additional info or adjustments are required from EB Admin. The request status will transition to <span className="font-semibold text-purple-800">NEEDS_INFO</span> allowing the requester to edit and resubmit.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Clarification Instructions (Required, min 5 characters)
                </label>
                <textarea
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => {
                    setReviewNotes(e.target.value)
                    if (reviewNotesError) setReviewNotesError('')
                  }}
                  placeholder="e.g. Please verify user account quota before requesting session expansion..."
                  className={cn(
                    'w-full p-3 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-sans',
                    reviewNotesError
                      ? 'border-rose-400 ring-rose-200 bg-rose-50/20'
                      : 'border-slate-300 focus:ring-primary/20 focus:border-primary'
                  )}
                />
                {reviewNotesError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{reviewNotesError}</p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReturnOpen(false)}
                disabled={returnMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReturn}
                isLoading={returnMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Return to EB Admin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Visual Diff Component (Red -> Green highlighting) ───────────────────────

interface VisualDiffModalProps {
  request: ChangeRequest
  customer: CustomerRead | null
  isOpen: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onReturn: () => void
}

function VisualDiffModal({
  request,
  customer,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onReturn,
}: VisualDiffModalProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual')

  if (!isOpen) return null

  const isPendingReview = request.status === 'PENDING' || request.status === 'IN_REVIEW'
  const payload = request.payload || {}

  // Helper to format values
  const renderValue = (key: string, val: any) => {
    if (val === undefined || val === null || val === '') {
      return <span className="text-slate-400 italic">None / Not set</span>
    }
    if (typeof val === 'boolean') {
      return (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono',
            val ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
          )}
        >
          {val ? 'TRUE (Enabled)' : 'FALSE (Disabled)'}
        </span>
      )
    }
    if (key === 'primary_color' || key === 'secondary_color') {
      return (
        <div className="inline-flex items-center gap-2 font-mono text-xs">
          <span
            className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
            style={{ backgroundColor: String(val) }}
          />
          <span>{String(val)}</span>
        </div>
      )
    }
    if (typeof val === 'object') {
      return <pre className="font-mono text-xs text-slate-800">{JSON.stringify(val, null, 2)}</pre>
    }
    return <span className="font-medium text-xs text-slate-800">{String(val)}</span>
  }

  // Extract Diff Entries
  const isBandwidthProfile = request.request_type === 'BANDWIDTH_PROFILE'
  const diffEntries: { key: string; label: string; currentVal: any; proposedVal: any; isChanged: boolean }[] = []

  if (!isBandwidthProfile) {
    Object.keys(payload).forEach((k) => {
      const currentVal = customer ? (customer as any)[k] : undefined
      const proposedVal = payload[k]
      const isChanged = JSON.stringify(currentVal) !== JSON.stringify(proposedVal)
      diffEntries.push({
        key: k,
        label: FIELD_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        currentVal,
        proposedVal,
        isChanged,
      })
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold">Change Request #{request.id}</h2>
              <ChangeRequestTypeBadge type={request.request_type} />
              <ChangeRequestStatusBadge status={request.status} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Customer: <strong className="text-slate-200">{customer?.company_name || `ID #${request.customer_id}`}</strong> • Submitted:{' '}
              {request.requested_at ? new Date(request.requested_at).toLocaleString() : '—'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex text-xs">
              <button
                onClick={() => setActiveTab('visual')}
                className={cn(
                  'px-3 py-1 rounded-md font-medium transition-colors',
                  activeTab === 'visual' ? 'bg-primary text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                )}
              >
                Visual Diff
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={cn(
                  'px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1',
                  activeTab === 'json' ? 'bg-primary text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                )}
              >
                <Code2 className="w-3.5 h-3.5" />
                Raw JSON
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* EB Notes & Rationale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                EB Requester Rationale
              </span>
              <p className="text-xs text-slate-800 whitespace-pre-wrap font-sans">
                {request.eb_notes || <span className="text-slate-400 italic">No notes provided with this request.</span>}
              </p>
            </div>

            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-700 block mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                NOC Operational Notes & Audit
              </span>
              <p className="text-xs text-purple-900 whitespace-pre-wrap font-sans">
                {request.noc_notes || <span className="text-purple-400 italic">No review notes recorded yet.</span>}
              </p>
            </div>
          </div>

          {/* Diff View Tab */}
          {activeTab === 'visual' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileDiff className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Configuration Change Comparison
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block" />
                    <span className="text-slate-600 font-medium">Live / Previous Value</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
                    <span className="text-slate-600 font-medium">Proposed / Target Value</span>
                  </div>
                </div>
              </div>

              {/* Bandwidth Profile Diff */}
              {isBandwidthProfile ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-semibold text-xs text-slate-700 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Tiered Bandwidth Profiles (Download / Upload Limits)
                  </div>
                  <div className="p-4 space-y-3">
                    {Object.entries(payload).map(([tierKey, tierVal]: [string, any]) => (
                      <div key={tierKey} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold font-mono text-xs uppercase">
                            {tierKey}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                            ↓ {tierVal?.download_speed ?? tierVal?.rate ?? '—'} Mbps / ↑ {tierVal?.upload_speed ?? tierVal?.ceil ?? '—'} Mbps
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Field by Field Visual Diff */
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 shadow-2xs">
                  {diffEntries.map((entry) => (
                    <div
                      key={entry.key}
                      className={cn(
                        'p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors',
                        entry.isChanged ? 'bg-amber-50/15' : 'bg-white'
                      )}
                    >
                      <div className="min-w-[200px]">
                        <span className="text-xs font-bold text-slate-900 block">{entry.label}</span>
                        <span className="text-[10.5px] font-mono text-slate-400">{entry.key}</span>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        {/* Current (Red) */}
                        <div className="p-2.5 rounded-lg border bg-rose-50/80 border-rose-200/80">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
                            Current Value
                          </span>
                          <div className="text-rose-900 line-through opacity-85 text-xs">
                            {renderValue(entry.key, entry.currentVal)}
                          </div>
                        </div>

                        {/* Proposed (Green) */}
                        <div className="p-2.5 rounded-lg border bg-emerald-50 border-emerald-200 shadow-2xs">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 block mb-1 flex items-center justify-between">
                            <span>Proposed Value</span>
                            <ArrowRight className="w-3 h-3 text-emerald-600" />
                          </span>
                          <div className="text-emerald-950 font-semibold text-xs">
                            {renderValue(entry.key, entry.proposedVal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Raw JSON Inspector Tab */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600 block">
                Proposed Request Payload (JSON)
              </span>
              <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 max-h-96">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>

          {isPendingReview && (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={onReject}
                className="gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={onReturn}
                className="text-purple-700 border-purple-300 hover:bg-purple-50 gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Return for Info
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={onApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Apply to Router
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

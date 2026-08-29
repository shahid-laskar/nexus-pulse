import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  GitPullRequest,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  Building2,
  Filter,
} from 'lucide-react'

import { ebApi } from '@/api/eb'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChangeRequestStatusBadge, ChangeRequestTypeBadge } from '@/components/ui/Badge'
import { ChangeRequestDetailModal } from '@/pages/eb/ChangeRequestDetailModal'
import { EBChangeRequestModal } from '@/pages/eb/EBChangeRequestModal'
import type { ChangeRequest, ChangeRequestStatus, ChangeRequestType } from '@/types'

export function EBChangeRequestsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])

  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [resubmitTarget, setResubmitTarget] = useState<ChangeRequest | null>(null)

  // Fetch all change requests across customers in the BA
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['eb-all-change-requests'],
    queryFn: () => ebApi.listAllChangeRequests(),
  })

  // Fetch customers to map customer_id to company_name
  const { data: customersData } = useQuery({
    queryKey: ['eb-customers-lookup'],
    queryFn: () => ebApi.list({ limit: 100 }),
  })

  const customerMap = new Map<number, string>()
  customersData?.customers?.forEach((c) => customerMap.set(c.id, c.company_name))

  // Filter calculations
  const pendingCount = requests.filter((r) => r.status === 'PENDING' || r.status === 'IN_REVIEW').length
  const needsInfoCount = requests.filter((r) => r.status === 'NEEDS_INFO').length
  const appliedCount = requests.filter((r) => r.status === 'APPLIED').length
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length

  const filteredRequests = requests.filter((r) => {
    // Status filter
    if (statusFilter === 'PENDING' && !(r.status === 'PENDING' || r.status === 'IN_REVIEW')) return false
    if (statusFilter === 'NEEDS_INFO' && r.status !== 'NEEDS_INFO') return false
    if (statusFilter === 'APPLIED' && r.status !== 'APPLIED') return false
    if (statusFilter === 'REJECTED' && r.status !== 'REJECTED') return false

    // Type filter
    if (typeFilter !== 'ALL' && r.request_type !== typeFilter) return false

    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const companyName = (customerMap.get(r.customer_id) || '').toLowerCase()
      const idMatch = String(r.id).includes(term)
      const custIdMatch = String(r.customer_id).includes(term)
      const ebNotesMatch = (r.eb_notes || '').toLowerCase().includes(term)
      const nocNotesMatch = (r.noc_notes || '').toLowerCase().includes(term)
      if (!companyName.includes(term) && !idMatch && !custIdMatch && !ebNotesMatch && !nocNotesMatch) {
        return false
      }
    }

    return true
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Change Requests Hub"
        subtitle="Track policy modifications, bandwidth profile updates, and NOC approvals across all enterprise clients"
        actions={
          <Button size="sm" variant="secondary" onClick={() => refetch()} className="gap-1.5 h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* Attention Banner if requests need info */}
        {needsInfoCount > 0 && (
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-200/80 text-amber-800 shrink-0">
                <AlertCircle className="h-4.5 w-4.5" />
              </span>
              <div>
                <strong className="text-amber-950 font-bold">{needsInfoCount} Change Request(s) Require Revisions</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  The NOC team has returned requests with specific instructions. Update the parameters and resubmit for approval.
                </p>
              </div>
            </div>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => setStatusFilter('NEEDS_INFO')}
              className="gap-1 text-amber-900 bg-white hover:bg-amber-100 border-amber-300 h-7 text-xs font-semibold whitespace-nowrap"
            >
              Filter Action Required
            </Button>
          </div>
        )}

        {/* Tab Filters and Summary Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Requests ({requests.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Pending NOC ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('NEEDS_INFO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === 'NEEDS_INFO'
                  ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Needs Info ({needsInfoCount})
            </button>
            <button
              onClick={() => setStatusFilter('APPLIED')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === 'APPLIED'
                  ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Applied ({appliedCount})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === 'REJECTED'
                  ? 'bg-white text-rose-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              Rejected ({rejectedCount})
            </button>
          </div>

          {/* Search & Type dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search client, ID, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary w-64 shadow-2xs"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs font-medium text-slate-700"
            >
              <option value="ALL">All Categories</option>
              <option value="BANDWIDTH_PROFILE">Bandwidth Profiles</option>
              <option value="PORTAL_SETTINGS">Branding &amp; Portal</option>
              <option value="SESSION_POLICY">Session Policies</option>
              <option value="AUTH_OPTIONS">Auth &amp; OTP Options</option>
              <option value="QOS">QoS &amp; Bandwidth</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <Card className="border-slate-200 shadow-2xs overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-900">
                Change Requests Directory ({filteredRequests.length})
              </h3>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                Loading change requests...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <GitPullRequest className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No change requests found matching the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Req ID</th>
                      <th className="px-5 py-3">Enterprise Client</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">EB Rationale &amp; Feedback</th>
                      <th className="px-5 py-3">Submitted</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => {
                      const companyName = customerMap.get(req.customer_id) || `Customer #${req.customer_id}`
                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            #{req.id}
                          </td>
                          <td className="px-5 py-3.5">
                            <Link
                              to={`/eb/customers/${req.customer_id}`}
                              className="font-semibold text-primary hover:underline flex items-center gap-1.5"
                            >
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {companyName}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">
                            <ChangeRequestTypeBadge type={req.request_type} />
                          </td>
                          <td className="px-5 py-3.5">
                            <ChangeRequestStatusBadge status={req.status} />
                          </td>
                          <td className="px-5 py-3.5 max-w-xs">
                            <div className="truncate text-slate-700 font-normal" title={req.eb_notes}>
                              {req.eb_notes || <span className="text-slate-400 italic">No notes</span>}
                            </div>
                            {req.noc_notes && (
                              <div
                                className="truncate text-[11px] text-purple-700 mt-0.5 font-medium"
                                title={`NOC: ${req.noc_notes}`}
                              >
                                NOC: {req.noc_notes}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                            {req.requested_at ? new Date(req.requested_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedRequest(req)
                                  setIsDetailOpen(true)
                                }}
                                className="gap-1 text-slate-700 h-7 text-[11px]"
                              >
                                <Eye className="w-3 h-3" />
                                Inspect
                              </Button>

                              {req.status === 'NEEDS_INFO' && (
                                <Button
                                  size="xs"
                                  variant="primary"
                                  onClick={() => setResubmitTarget(req)}
                                  className="gap-1 h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Revise &amp; Resubmit
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Details & Diff Modal */}
      <ChangeRequestDetailModal
        request={selectedRequest}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedRequest(null)
        }}
        onResubmit={(req) => {
          setIsDetailOpen(false)
          setResubmitTarget(req)
        }}
      />

      {/* Resubmit Modal */}
      {resubmitTarget && (
        <EBChangeRequestModal
          isOpen={true}
          onClose={() => setResubmitTarget(null)}
          customer={{ id: resubmitTarget.customer_id } as any}
          resubmitItem={resubmitTarget}
          onSuccess={() => {
            setResubmitTarget(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}

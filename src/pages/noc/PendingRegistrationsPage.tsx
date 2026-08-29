import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, Info, RefreshCw, UserCheck } from 'lucide-react'
import { nocApi } from '@/api/noc'
import { customersApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { PendingRegistrationItem, CustomerRead } from '@/types'

export function PendingRegistrationsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const qc = useQueryClient()

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined)
  const [approvingItem, setApprovingItem] = useState<PendingRegistrationItem | null>(null)
  const [rejectingItem, setRejectingItem] = useState<PendingRegistrationItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [inspectingItem, setInspectingItem] = useState<PendingRegistrationItem | null>(null)

  // 1. Fetch provisioned customers for filter
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'pushed-filter'],
    queryFn: () => customersApi.list({ limit: 200 }),
  })

  const pushedCustomers: CustomerRead[] = (customersData?.customers || []).filter(c => c.is_pushed)

  // 2. Fetch pending registrations
  const {
    data: pendingData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['noc-pending-registrations', selectedCustomerId],
    queryFn: () => nocApi.listPendingRegistrations(selectedCustomerId),
    refetchInterval: 15_000,
  })

  const requests: PendingRegistrationItem[] = pendingData?.pending_requests || []

  // 3. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (item: PendingRegistrationItem) => {
      const custId = item.customer_id || selectedCustomerId
      if (!custId) throw new Error('Customer ID is missing for approval')
      return nocApi.approveRegistration(custId, item.id)
    },
    onSuccess: (res, item) => {
      const otp = res.approval_otp ? ` (OTP: ${res.approval_otp})` : ''
      toast.success(`Registration approved for ${item.name || item.phone}${otp}`)
      qc.invalidateQueries({ queryKey: ['noc-pending-registrations'] })
      setApprovingItem(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to approve registration')),
  })

  // 4. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ item, reason }: { item: PendingRegistrationItem; reason: string }) => {
      const custId = item.customer_id || selectedCustomerId
      if (!custId) throw new Error('Customer ID is missing for rejection')
      return nocApi.rejectRegistration(custId, item.id, reason)
    },
    onSuccess: (_, { item }) => {
      toast.success(`Registration rejected for ${item.name || item.phone}`)
      qc.invalidateQueries({ queryKey: ['noc-pending-registrations'] })
      setRejectingItem(null)
      setRejectionReason('')
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to reject registration')),
  })

  const handleOpenReject = (item: PendingRegistrationItem) => {
    setRejectingItem(item)
    setRejectionReason('')
  }

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingItem) return
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters')
      return
    }
    rejectMutation.mutate({ item: rejectingItem, reason: rejectionReason.trim() })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Pending Registrations Queue"
        subtitle="Review, approve, or reject user self-registration requests from captive portal instances."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* Filter bar & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Filter by Customer:
            </label>
            <select
              value={selectedCustomerId ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined
                setSelectedCustomerId(val)
              }}
              className="h-8 text-xs border border-slate-200 rounded-lg px-3 bg-white text-slate-700 font-medium outline-none focus:ring-1 focus:ring-primary min-w-[260px]"
            >
              <option value="">All Provisioned Customers ({pushedCustomers.length})</option>
              {pushedCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} (Slug: {c.captive_customer_slug || `#${c.id}`})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Pending Queue:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
              {requests.length} awaiting review
            </span>
          </div>
        </div>

        {/* Requests Table */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600">
                <UserCheck className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Registration Queue ({requests.length})</h3>
                <p className="text-[11px] text-slate-500">Awaiting NOC verification and OTP issuance</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <PageLoader />
            ) : isError ? (
              <div className="p-8 text-center text-rose-600 text-xs">
                {extractErrorMessage(error, 'Failed to fetch pending registrations queue.')}
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Applicant Phone &amp; Name</Th>
                    <Th>Customer / Tenant</Th>
                    <Th>Submitted</Th>
                    <Th>Status</Th>
                    <Th>Details</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {!requests.length ? (
                    <EmptyRow cols={7} message="No pending registration requests waiting for approval." />
                  ) : (
                    requests.map((r) => (
                      <tr key={`${r.customer_id || 0}-${r.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <Td className="font-mono text-xs text-slate-400">#{r.id}</Td>
                        <Td>
                          <div className="font-mono font-bold text-slate-900 text-xs">{r.phone}</div>
                          <div className="text-[11px] text-slate-500">{r.name || '—'}</div>
                        </Td>
                        <Td>
                          <div className="font-semibold text-slate-900 text-xs">{r.customer_name || `Customer #${r.customer_id}`}</div>
                          {r.customer_slug && (
                            <span className="font-mono text-[11px] text-slate-400">
                              {r.customer_slug}
                            </span>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-xs text-slate-500">
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}
                          {r.age_hours != null && (
                            <span className="block text-[11px] font-mono text-amber-600 font-medium">
                              {r.age_hours === 0 ? 'Just now' : `${r.age_hours}h ago`}
                            </span>
                          )}
                        </Td>
                        <Td>
                          <Badge label="PENDING" variant="warning" />
                        </Td>
                        <Td>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => setInspectingItem(r)}
                            className="flex items-center gap-1 h-7 text-xs"
                          >
                            <Info className="h-3 w-3" />
                            View Data
                          </Button>
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => setApprovingItem(r)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 h-7 text-xs"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              variant="danger"
                              onClick={() => handleOpenReject(r)}
                              className="flex items-center gap-1 h-7 text-xs"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Detail Inspection Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Applicant Registration Details</h3>
                <p className="text-xs text-slate-500 font-mono">Request #{inspectingItem.id} · {inspectingItem.phone}</p>
              </div>
              <Button size="xs" variant="secondary" onClick={() => setInspectingItem(null)}>
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Applicant Name</span>
                  <span className="font-semibold text-slate-900">{inspectingItem.name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="font-mono font-semibold text-slate-900">{inspectingItem.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">IP Address</span>
                  <span className="font-mono text-slate-900">{inspectingItem.ip_address || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Tenant</span>
                  <span className="font-semibold text-slate-900">{inspectingItem.customer_name || `Customer #${inspectingItem.customer_id}`}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                  Custom Form Data
                </span>
                {inspectingItem.registration_data && Object.keys(inspectingItem.registration_data).length > 0 ? (
                  <pre className="bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-auto max-h-48">
                    {JSON.stringify(inspectingItem.registration_data, null, 2)}
                  </pre>
                ) : (
                  <p className="text-slate-500 italic">No custom fields submitted.</p>
                )}
              </div>

              {inspectingItem.user_agent && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">User Agent</span>
                  <p className="font-mono text-[10.5px] text-slate-500 truncate">{inspectingItem.user_agent}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
              <Button size="sm" variant="secondary" onClick={() => setInspectingItem(null)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const item = inspectingItem
                  setInspectingItem(null)
                  setApprovingItem(item)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(approvingItem)}
        title="Approve User Registration?"
        description={
          approvingItem ? (
            <div className="space-y-2 text-sm text-slate-900">
              <p>
                Are you sure you want to approve registration for <strong>{approvingItem.name || approvingItem.phone}</strong>?
              </p>
              <p className="text-xs text-slate-500">
                This will create a live captive portal account in customer <strong>{approvingItem.customer_name || `#${approvingItem.customer_id}`}</strong> and generate an approval OTP.
              </p>
            </div>
          ) : ''
        }
        confirmText="Approve & Generate OTP"
        variant="primary"
        isLoading={approveMutation.isPending}
        onConfirm={() => approvingItem && approveMutation.mutate(approvingItem)}
        onClose={() => setApprovingItem(null)}
      />

      {/* Reject Modal with Reason Input */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Reject Registration</h3>
            <p className="text-xs text-slate-500 mb-4">
              Reject registration for <strong>{rejectingItem.name || rejectingItem.phone}</strong> (Request #{rejectingItem.id}).
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Rejection Reason (Minimum 10 characters) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Employee ID not found in department directory."
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-critical"
                />
                <span className="text-[10.5px] text-slate-500">
                  {rejectionReason.length}/10 characters minimum
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRejectingItem(null)}
                  disabled={rejectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  isLoading={rejectMutation.isPending}
                  disabled={rejectionReason.trim().length < 10}
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

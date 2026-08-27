import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  FileEdit,
  Sliders,
  History,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { ebApi } from '@/api/eb'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge, ChangeRequestStatusBadge, ChangeRequestTypeBadge } from '@/components/ui/Badge'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'
import { EBChangeRequestModal } from './EBChangeRequestModal'
import { ChangeRequestDetailModal } from './ChangeRequestDetailModal'
import type { ChangeRequest } from '@/types'

export function EBCustomerDetailPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])
  const { id } = useParams<{ id: string }>()
  const customerId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { canManageCustomers } = useAuthStore()

  const [confirmReady, setConfirmReady] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  // Change Request Modal states
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [resubmitTarget, setResubmitTarget] = useState<ChangeRequest | null>(null)
  const [inspectTarget, setInspectTarget] = useState<ChangeRequest | null>(null)

  // Query Customer Details
  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['eb-customer', customerId],
    queryFn: () => ebApi.get(customerId),
    enabled: Boolean(customerId),
  })

  // Query Change Requests History
  const isPushedOrActive =
    customer?.is_pushed || customer?.status === 'PUSHED' || customer?.status === 'ACTIVE'

  const { data: changeRequests = [], isLoading: isLoadingCRs } = useQuery({
    queryKey: ['eb-change-requests', customerId],
    queryFn: () => ebApi.listChangeRequests(customerId),
    enabled: Boolean(customerId),
  })

  const markReady = useMutation({
    mutationFn: () => ebApi.markReady(customerId),
    onSuccess: () => {
      toast.success('Marked as READY for NOC provisioning')
      qc.invalidateQueries({ queryKey: ['eb-customer', customerId] })
      qc.invalidateQueries({ queryKey: ['eb-customers'] })
      setConfirmReady(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to mark customer READY')),
  })

  const deactivate = useMutation({
    mutationFn: () => ebApi.deactivate(customerId),
    onSuccess: () => {
      toast.success('EB Customer deactivated')
      qc.invalidateQueries({ queryKey: ['eb-customers'] })
      setConfirmDeactivate(false)
      navigate('/eb')
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to deactivate EB customer')),
  })

  if (isLoading) return <PageLoader />
  if (isError || !customer) {
    return (
      <div className="p-8 text-center text-red-600">
        EB Customer not found or error loading details.
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={customer.company_name}
        subtitle={`EB Customer ID: ${customer.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/eb">
              <Button variant="secondary" size="sm">
                ← Back
              </Button>
            </Link>

            {canManageCustomers && !customer.is_pushed && (
              <Link to={`/eb/customers/${customer.id}/edit`}>
                <Button size="sm" variant="secondary">
                  Edit Details
                </Button>
              </Link>
            )}

            {canManageCustomers && isPushedOrActive && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setResubmitTarget(null)
                  setShowChangeModal(true)
                }}
                className="flex items-center gap-1.5 shadow-sm"
              >
                <Sliders className="w-4 h-4" />
                Request Change
              </Button>
            )}

            {canManageCustomers && customer.status === 'DRAFT' && (
              <Button size="sm" onClick={() => setConfirmReady(true)}>
                Mark READY
              </Button>
            )}

            {canManageCustomers && !customer.is_pushed && (
              <Button size="sm" variant="danger" onClick={() => setConfirmDeactivate(true)}>
                Deactivate
              </Button>
            )}
          </div>
        }
      />

      <div className="p-8 space-y-6 max-w-6xl">
        {/* Status Header Strip */}
        <div className="flex flex-wrap items-center gap-4 bg-surface p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Status</span>
            <div className="mt-1">
              <StatusBadge status={customer.status} />
            </div>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-xs text-slate-500 font-bold uppercase">Customer Type</span>
            <p className="text-sm font-medium text-foreground capitalize">{customer.customer_type}</p>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-xs text-slate-500 font-bold uppercase">GSTIN</span>
            <p className="text-sm font-mono text-foreground">{customer.gstin}</p>
          </div>
          {customer.cin && (
            <div className="border-l border-slate-200 pl-4">
              <span className="text-xs text-slate-500 font-bold uppercase">CIN</span>
              <p className="text-sm font-mono text-foreground">{customer.cin}</p>
            </div>
          )}
          {customer.captive_customer_slug && (
            <div className="border-l border-slate-200 pl-4">
              <span className="text-xs text-slate-500 font-bold uppercase">Router Slug</span>
              <p className="text-sm font-mono text-primary font-medium">
                {customer.captive_customer_slug}
              </p>
            </div>
          )}
        </div>

        {/* Informational Banner for Pushed Customers */}
        {isPushedOrActive && (
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900">
                  Provisioned Customer — Policy Change Management Active
                </h4>
                <p className="text-xs text-blue-700">
                  Direct database edits are locked for active router deployments. Submit a formal change
                  request for NOC review to modify portal settings, quotas, bandwidth profiles, or QoS.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setResubmitTarget(null)
                setShowChangeModal(true)
              }}
              className="shrink-0"
            >
              Request Change
            </Button>
          </div>
        )}

        {/* Customer Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Details */}
          <Card>
            <CardHeader>Contact Person Details</CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Contact Name</span>
                <p className="font-semibold text-foreground">{customer.contact_person}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Email</span>
                <p className="text-slate-800">{customer.contact_email}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Phone</span>
                <p className="text-slate-800">{customer.contact_phone}</p>
              </div>
            </CardBody>
          </Card>

          {/* Manager & Branch */}
          <Card>
            <CardHeader>Branch & Manager Information</CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Branch</span>
                <p className="font-semibold text-foreground">
                  {customer.branch_name || '—'} {customer.branch_code ? `(${customer.branch_code})` : ''}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Manager Name</span>
                <p className="text-slate-800">{customer.manager_name || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Manager Phone</span>
                <p className="text-slate-800">{customer.manager_phone || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Manager Email</span>
                <p className="text-slate-800">{customer.manager_email || '—'}</p>
              </div>
            </CardBody>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>Billing Address</CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-800">
              <p>{customer.billing_address_line1}</p>
              {customer.billing_address_line2 && <p>{customer.billing_address_line2}</p>}
              <p>
                {customer.billing_city}, {customer.billing_state} - {customer.billing_pincode}
              </p>
            </CardBody>
          </Card>

          {/* Installation Address */}
          <Card>
            <CardHeader>Installation Address</CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-800">
              {customer.same_as_billing ? (
                <p className="text-slate-500 italic">Same as billing address</p>
              ) : (
                <>
                  <p>{customer.installation_address_line1}</p>
                  {customer.installation_address_line2 && <p>{customer.installation_address_line2}</p>}
                  <p>
                    {customer.installation_city}, {customer.installation_state} -{' '}
                    {customer.installation_pincode}
                  </p>
                </>
              )}
            </CardBody>
          </Card>

          {/* Portal Settings Overview */}
          <Card>
            <CardHeader>Portal Branding & Access</CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase block">Primary</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                      style={{ backgroundColor: customer.primary_color }}
                    />
                    <span className="font-mono text-xs text-slate-800">{customer.primary_color}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase block">Secondary</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                      style={{ backgroundColor: customer.secondary_color }}
                    />
                    <span className="font-mono text-xs text-slate-800">{customer.secondary_color}</span>
                  </div>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Welcome Message</span>
                <p className="text-slate-800 text-xs italic mt-0.5">
                  {customer.welcome_message || '(empty)'}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                <span className="text-slate-500">Domain:</span>
                <span className="font-mono font-medium text-slate-800">
                  {customer.portal_domain || '—'}
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Network & QoS Configuration */}
          <Card>
            <CardHeader>Network & Provisioning Settings</CardHeader>
            <CardBody className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Max Bandwidth:</span>
                <span className="font-mono font-bold text-slate-800">{customer.max_bandwidth || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">VLANs:</span>
                <span className="font-mono text-slate-800">
                  SVLAN {customer.svlan ?? '—'} / CVLAN {customer.cvlan ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">WAN Interface:</span>
                <span className="font-mono text-slate-800">{customer.wan_interface || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Session Timeout:</span>
                <span className="text-slate-800">
                  {customer.session_timeout ? `${Math.round(customer.session_timeout / 3600)}h` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Max Concurrent Devices:</span>
                <span className="text-slate-800">{customer.max_concurrent_sessions ?? '—'}</span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Change Requests History Section */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Change Requests History</h3>
                <p className="text-xs text-slate-500">
                  Audit log of all requested policy, branding, and bandwidth modifications
                </p>
              </div>
            </div>

            {canManageCustomers && isPushedOrActive && (
              <Button
                size="xs"
                variant="primary"
                onClick={() => {
                  setResubmitTarget(null)
                  setShowChangeModal(true)
                }}
                className="flex items-center gap-1"
              >
                <Sliders className="w-3.5 h-3.5" />
                New Change Request
              </Button>
            )}
          </div>

          <CardBody className="p-0">
            {isLoadingCRs ? (
              <div className="p-8 text-center">
                <Spinner className="mx-auto" />
              </div>
            ) : changeRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No change requests found for this customer.</p>
                {isPushedOrActive && (
                  <p className="text-xs text-slate-400 mt-1">
                    Click "Request Change" above to submit policy or branding updates to NOC.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">EB Notes</th>
                      <th className="px-4 py-3">NOC Review</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {changeRequests.map((cr) => {
                      const submittedAt = cr.requested_at
                        ? new Date(cr.requested_at).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'

                      return (
                        <tr key={cr.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-slate-900">
                            #{cr.id}
                          </td>
                          <td className="px-4 py-3">
                            <ChangeRequestTypeBadge type={cr.request_type} />
                          </td>
                          <td className="px-4 py-3">
                            <ChangeRequestStatusBadge status={cr.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {submittedAt}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">
                            {cr.eb_notes || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs max-w-xs truncate">
                            {cr.noc_notes ? (
                              <span
                                className={
                                  cr.status === 'NEEDS_INFO'
                                    ? 'text-purple-700 font-medium'
                                    : cr.status === 'REJECTED'
                                    ? 'text-rose-700 font-medium'
                                    : 'text-slate-600'
                                }
                              >
                                {cr.noc_notes}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => setInspectTarget(cr)}
                              className="inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </Button>

                            {cr.status === 'NEEDS_INFO' && canManageCustomers && (
                              <Button
                                size="xs"
                                variant="primary"
                                onClick={() => {
                                  setResubmitTarget(cr)
                                  setShowChangeModal(true)
                                }}
                                className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Resubmit
                              </Button>
                            )}
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

        {/* Change Request Modal (Create / Resubmit) */}
        <EBChangeRequestModal
          isOpen={showChangeModal}
          onClose={() => {
            setShowChangeModal(false)
            setResubmitTarget(null)
          }}
          customer={customer}
          resubmitItem={resubmitTarget}
        />

        {/* Change Request Detail Inspector Modal */}
        <ChangeRequestDetailModal
          isOpen={Boolean(inspectTarget)}
          request={inspectTarget}
          onClose={() => setInspectTarget(null)}
          onResubmit={(cr) => {
            setInspectTarget(null)
            setResubmitTarget(cr)
            setShowChangeModal(true)
          }}
        />

        {/* Confirmation Dialogs */}
        <ConfirmDialog
          isOpen={confirmReady}
          title="Mark EB Customer as READY?"
          description={`Are you sure you want to mark ${customer.company_name} as READY? This will notify the NOC team to provision network settings.`}
          confirmText="Mark Ready"
          variant="primary"
          isLoading={markReady.isPending}
          onConfirm={() => markReady.mutate()}
          onClose={() => setConfirmReady(false)}
        />

        <ConfirmDialog
          isOpen={confirmDeactivate}
          title="Deactivate EB Customer?"
          description={`Are you sure you want to deactivate ${customer.company_name}? This action cannot be undone.`}
          confirmText="Deactivate"
          variant="danger"
          isLoading={deactivate.isPending}
          onConfirm={() => deactivate.mutate()}
          onClose={() => setConfirmDeactivate(false)}
        />
      </div>
    </div>
  )
}

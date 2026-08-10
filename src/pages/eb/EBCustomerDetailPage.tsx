import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ebApi } from '@/api/eb'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'

export function EBCustomerDetailPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])
  const { id } = useParams<{ id: string }>()
  const customerId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { canManageCustomers } = useAuthStore()

  const [confirmReady, setConfirmReady] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['eb-customer', customerId],
    queryFn: () => ebApi.get(customerId),
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
          <div className="flex gap-2">
            <Link to="/eb"><Button variant="secondary" size="sm">← Back</Button></Link>
            {canManageCustomers && !customer.is_pushed && (
              <Link to={`/eb/customers/${customer.id}/edit`}>
                <Button size="sm" variant="secondary">Edit Details</Button>
              </Link>
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

      <div className="p-8 space-y-6 max-w-5xl">
        <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Status</span>
            <div className="mt-1"><StatusBadge status={customer.status} /></div>
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
        </div>

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
              <p>{customer.billing_city}, {customer.billing_state} - {customer.billing_pincode}</p>
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
                  <p>{customer.installation_city}, {customer.installation_state} - {customer.installation_pincode}</p>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Modal confirm dialogs */}
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

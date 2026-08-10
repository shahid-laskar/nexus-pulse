import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { customersApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-hairline last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] break-all">{value ?? '—'}</span>
    </div>
  )
}

export function CustomerDetailPage() {
  useRequireAuth()
  const { id }     = useParams<{ id: string }>()
  const customerId = Number(id)
  const { canManageCustomers, canAccessNOC } = useAuthStore()
  const qc = useQueryClient()
  const [confirmReadyModal, setConfirmReadyModal] = useState(false)

  const { data: c, isLoading } = useQuery({
    queryKey: ['customers', customerId],
    queryFn:  () => customersApi.get(customerId),
    enabled:  Boolean(customerId),
  })

  const markReady = useMutation({
    mutationFn: () => customersApi.markReady(customerId),
    onSuccess: () => {
      toast.success('Marked as READY — NOC team can now provision')
      qc.invalidateQueries({ queryKey: ['customers', customerId] })
      setConfirmReadyModal(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to mark customer READY')),
  })

  if (isLoading) return <PageLoader />
  if (!c) return <div className="p-8 text-muted-foreground">Customer not found</div>

  return (
    <div>
      <PageHeader
        title={c.company_name}
        subtitle={c.gstin}
        actions={
          <div className="flex gap-2">
            <Link to="/customers"><Button variant="secondary" size="sm">← Back</Button></Link>
            {canManageCustomers && c.status === 'DRAFT' && (
              <Button size="sm" variant="secondary" onClick={() => setConfirmReadyModal(true)}>
                ✅ Mark Ready
              </Button>
            )}
            {canAccessNOC && c.can_be_pushed && (
              <Link to={`/noc/customers/${id}/onboard`}>
                <Button size="sm">Push to Router →</Button>
              </Link>
            )}
            {canAccessNOC && c.is_pushed && (
              <Link to={`/noc/customers/${id}/sessions`}>
                <Button size="sm" variant="secondary">📡 Sessions & Diagnostics</Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        <Card>
          <CardHeader><h3 className="font-semibold text-foreground">Overview</h3></CardHeader>
          <CardBody>
            <InfoRow label="Status"  value={<StatusBadge status={c.status} />} />
            <InfoRow label="Type"    value={c.customer_type} />
            <InfoRow label="Is Pushed" value={c.is_pushed ? '✅ Yes' : '❌ No'} />
            <InfoRow label="Captive Slug" value={c.captive_customer_slug || '—'} />
            <InfoRow label="Instance ID"  value={c.captive_instance_id ?? '—'} />
            <InfoRow label="Total Users"  value={c.total_users} />
            <InfoRow label="Pushed At"    value={c.pushed_at ? new Date(c.pushed_at).toLocaleString() : '—'} />
            <InfoRow label="Created At"   value={new Date(c.created_at).toLocaleString()} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-foreground">Contact</h3></CardHeader>
          <CardBody>
            <InfoRow label="Person" value={c.contact_person} />
            <InfoRow label="Email"  value={c.contact_email} />
            <InfoRow label="Phone"  value={c.contact_phone} />
            <InfoRow label="City"   value={c.billing_city} />
            <InfoRow label="State"  value={c.billing_state} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-foreground">Portal Settings</h3></CardHeader>
          <CardBody>
            <InfoRow label="Approval Mode"    value={c.registration_approval_mode} />
            <InfoRow label="Daily Limit"      value={c.daily_data_limit_mb ? `${c.daily_data_limit_mb} MB` : 'Unlimited'} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-foreground">Branding</h3></CardHeader>
          <CardBody>
            <InfoRow label="Primary Color" value={
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ background: c.primary_color }} />
                {c.primary_color}
              </span>
            } />
            <InfoRow label="Secondary Color" value={
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ background: c.secondary_color }} />
                {c.secondary_color}
              </span>
            } />
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmReadyModal}
        title={`Mark ${c.company_name} as READY?`}
        description="Are you sure you want to mark this customer as READY for NOC provisioning?"
        confirmText="Mark Ready"
        variant="primary"
        isLoading={markReady.isPending}
        onConfirm={() => markReady.mutate()}
        onClose={() => setConfirmReadyModal(false)}
      />
    </div>
  )
}

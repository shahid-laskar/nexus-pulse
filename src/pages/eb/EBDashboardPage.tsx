import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ebApi } from '@/api/eb'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useApiError } from '@/hooks/useApiError'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/auth'

export function EBDashboardPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])
  const { canManageCustomers } = useAuthStore()
  const { getError } = useApiError()
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['eb-stats'],
    queryFn:  ebApi.dashboard,
  })

  const { data: list, isLoading } = useQuery({
    queryKey: ['eb-customers'],
    queryFn:  () => ebApi.list({ limit: 200 }),
  })

  const markReady = useMutation({
    mutationFn: (id: number) => ebApi.markReady(id),
    onSuccess: () => {
      toast.success('Marked as READY — NOC can now provision')
      qc.invalidateQueries({ queryKey: ['eb-customers'] })
      qc.invalidateQueries({ queryKey: ['eb-stats'] })
    },
    onError: (err) => toast.error(getError(err)),
  })

  const customers = list?.customers ?? []

  return (
    <div>
      <PageHeader
        title="EB Management"
        subtitle="Enterprise broadband customer staging"
        actions={
          canManageCustomers
            ? <Link to="/eb/customers/create"><Button size="sm">➕ Add EB Customer</Button></Link>
            : undefined
        }
      />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total EB"  value={stats?.total   ?? '—'} />
          <StatCard label="Draft"     value={stats?.draft   ?? '—'} color="blue"   sub="being filled" />
          <StatCard label="Ready"     value={stats?.ready   ?? '—'} color="yellow" sub="awaiting NOC" />
          <StatCard label="Pushed"    value={stats?.pushed  ?? '—'} color="green"  sub="provisioned" />
        </div>

        {/* READY customers - action required */}
        {(stats?.ready ?? 0) > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
            <strong>{stats?.ready} customer(s)</strong> are ready for NOC provisioning.
            Share with the NOC team to complete setup.
          </div>
        )}

        {/* Customers table */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[#1a2340]">EB Customers</h2>
        </div>

        {isLoading ? <PageLoader /> : (
          <Table>
            <thead>
              <tr>
                <Th>Company</Th><Th>GSTIN</Th><Th>Status</Th><Th>Contact</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {!customers.length
                ? <EmptyRow cols={5} message="No EB customers yet. Add one to get started." />
                : customers.map(c => (
                  <tr key={c.id} className="hover:bg-[#fafbff]">
                    <Td>
                      <Link to={`/eb/customers/${c.id}`} className="font-semibold text-[#1a3a6b] hover:underline">
                        {c.company_name}
                      </Link>
                    </Td>
                    <Td className="font-mono text-xs">{c.gstin}</Td>
                    <Td><StatusBadge status={c.status} /></Td>
                    <Td className="text-[#6b7ea8] text-xs">{c.contact_person}<br />{c.contact_phone}</Td>
                    <Td>
                      <div className="flex gap-2 flex-wrap">
                        <Link to={`/eb/customers/${c.id}`}><Button size="sm" variant="secondary">View</Button></Link>
                        {canManageCustomers && !c.is_pushed && (
                          <Link to={`/eb/customers/${c.id}/edit`}><Button size="sm" variant="secondary">Edit</Button></Link>
                        )}
                        {canManageCustomers && c.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            loading={markReady.isPending}
                            onClick={() => { if (confirm('Mark as READY?')) markReady.mutate(c.id) }}
                          >
                            Mark Ready
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))
              }
            </tbody>
          </Table>
        )}
      </div>
    </div>
  )
}

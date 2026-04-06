import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { customersApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useApiError } from '@/hooks/useApiError'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/auth'
import type { CustomerStatus} from '@/types'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '',         label: 'All' },
  { value: 'DRAFT',   label: 'Draft' },
  { value: 'READY',   label: 'Ready' },
  { value: 'PUSHED',  label: 'Pushed' },
  { value: 'ACTIVE',  label: 'Active' },
  { value: 'INACTIVE',label: 'Inactive' },
]

export function CustomersPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN', 'BA_NOC_ADMIN', 'BA_EB_ADMIN'])
  const { canManageCustomers, canAccessNOC } = useAuthStore()
  const { getError } = useApiError()
  const qc           = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter,   setTypeFilter]   = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['customers', statusFilter, typeFilter],
    queryFn:  () => customersApi.list({
      status:        statusFilter  || undefined,     
      limit: 200,
    }),
  })

  const markReady = useMutation({
    mutationFn: (id: number) => customersApi.markReady(id),
    onSuccess: () => {
      toast.success('Customer marked as READY')
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => toast.error(getError(err)),
  })

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${data?.total ?? 0} customers`}
        actions={
          canManageCustomers
            ? <Link to="/customers/create"><Button size="sm">➕ Add Customer</Button></Link>
            : undefined
        }
      />
      <div className="p-8">
        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === f.value
                  ? 'bg-[#0a1628] text-white border-[#0a1628]'
                  : 'bg-white text-[#6b7ea8] border-[#d0d8ec] hover:border-[#1a3a6b]'
              }`}
            >
              {f.label}
            </button>
          ))}
          {/* <div className="w-px bg-[#d0d8ec] mx-1" />
          {(['', 'WIFI', 'EB'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                typeFilter === t
                  ? 'bg-[#0a1628] text-white border-[#0a1628]'
                  : 'bg-white text-[#6b7ea8] border-[#d0d8ec] hover:border-[#1a3a6b]'
              }`}
            >
              {t || 'All Types'}
            </button>
          ))} */}
        </div>

        {isLoading ? <PageLoader /> : (
          <Table>
            <thead>
              <tr>
                <Th>Company</Th>                
                <Th>Status</Th>
                <Th>Slug</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {!data?.customers.length
                ? <EmptyRow cols={5} message="No customers found" />
                : data.customers.map(c => (
                  <tr key={c.id} className="hover:bg-[#fafbff]">
                    <Td>
                      <Link to={`/customers/${c.id}`} className="font-semibold text-[#1a3a6b] hover:underline">
                        {c.company_name}
                      </Link>
                      <div className="text-xs text-[#6b7ea8]">{c.gstin}</div>
                    </Td>
                    {/* <Td>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        c.customer_type === 'EB' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                      }`}>{c.customer_type}</span>
                    </Td> */}
                    <Td><StatusBadge status={c.status} /></Td>
                    <Td>
                      {c.captive_customer_slug
                        ? <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.captive_customer_slug}</code>
                        : <span className="text-[#6b7ea8] text-xs">—</span>
                      }
                    </Td>
                    <Td>
                      <div className="flex gap-2 flex-wrap">
                        <Link to={`/customers/${c.id}`}><Button size="sm" variant="secondary">View</Button></Link>
                        {canManageCustomers && c.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={markReady.isPending}
                            onClick={() => {
                              if (confirm('Mark as READY for NOC provisioning?')) markReady.mutate(c.id)
                            }}
                          >
                            Mark Ready
                          </Button>
                        )}
                        {canAccessNOC && c.can_be_pushed && (
                          <Link to={`/noc/customers/${c.id}/onboard`}>
                            <Button size="sm">Push to Router</Button>
                          </Link>
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

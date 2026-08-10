import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { customersApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'
import type { CustomerRead } from '@/types'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '',         label: 'All' },
  { value: 'DRAFT',    label: 'Draft' },
  { value: 'READY',    label: 'Ready' },
  { value: 'PUSHED',   label: 'Pushed' },
  { value: 'ACTIVE',   label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const PAGE_SIZE = 25

export function CustomersPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN', 'BA_NOC_ADMIN', 'BA_EB_ADMIN'])
  const { canManageCustomers, canAccessNOC } = useAuthStore()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(0)
  const [selectedForReady, setSelectedForReady] = useState<CustomerRead | null>(null)

  const skip = page * PAGE_SIZE

  const { data, isLoading } = useQuery({
    queryKey: ['customers', statusFilter, skip, PAGE_SIZE],
    queryFn: () => customersApi.list({
      status: statusFilter || undefined,
      skip,
      limit: PAGE_SIZE,
    }),
  })

  const markReady = useMutation({
    mutationFn: (id: number) => customersApi.markReady(id),
    onSuccess: () => {
      toast.success('Customer marked as READY')
      qc.invalidateQueries({ queryKey: ['customers'] })
      setSelectedForReady(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to mark customer READY')),
  })

  const filteredCustomers = (data?.customers || []).filter(c =>
    !searchQuery ||
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE)

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${data?.total ?? 0} total customers`}
        actions={
          canManageCustomers
            ? <Link to="/customers/create"><Button size="sm">➕ Add Customer</Button></Link>
            : undefined
        }
      />
      <div className="p-8 space-y-5">
        {/* Filters & Search */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(0) }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground text-white border-[#0a1628]'
                    : 'bg-surface text-muted-foreground border-hairline hover:border-primary/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div>
            <input
              type="text"
              placeholder="Search by name, GSTIN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-64 focus:outline-none focus:border-[#004aad]"
            />
          </div>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Company & GSTIN</Th>
                  <Th>Status</Th>
                  <Th>Captive Slug</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {!filteredCustomers.length
                  ? <EmptyRow cols={4} message="No customers found" />
                  : filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-surface-2/50">
                      <Td>
                        <Link to={`/customers/${c.id}`} className="font-semibold text-primary hover:underline">
                          {c.company_name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">{c.gstin}</div>
                      </Td>
                      <Td><StatusBadge status={c.status} /></Td>
                      <Td>
                        {c.captive_customer_slug
                          ? <code className="text-xs bg-surface-2 text-foreground border border-hairline px-1.5 py-0.5 rounded font-mono">{c.captive_customer_slug}</code>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </Td>
                      <Td>
                        <div className="flex gap-2 flex-wrap">
                          <Link to={`/customers/${c.id}`}><Button size="sm" variant="secondary">View</Button></Link>
                          {canManageCustomers && c.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedForReady(c)}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-2 text-xs text-slate-600">
                <span>Page {page + 1} of {totalPages} ({data?.total} items)</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                  >
                    ← Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(selectedForReady)}
        title={`Mark ${selectedForReady?.company_name} as READY?`}
        description="Are you sure you want to mark this customer as READY for NOC provisioning?"
        confirmText="Mark Ready"
        variant="primary"
        isLoading={markReady.isPending}
        onConfirm={() => selectedForReady && markReady.mutate(selectedForReady.id)}
        onClose={() => setSelectedForReady(null)}
      />
    </div>
  )
}

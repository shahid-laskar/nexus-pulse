import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ebApi } from '@/api/eb'
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

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',         label: 'All Statuses' },
  { value: 'DRAFT',    label: 'DRAFT' },
  { value: 'READY',    label: 'READY' },
  { value: 'PUSHED',   label: 'PUSHED' },
  { value: 'ACTIVE',   label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

const PAGE_SIZE = 25

export function EBCustomerListPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])
  const { canManageCustomers } = useAuthStore()
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(0)

  const [selectedCustomerForReady, setSelectedCustomerForReady] = useState<CustomerRead | null>(null)
  const [selectedCustomerForDelete, setSelectedCustomerForDelete] = useState<CustomerRead | null>(null)

  const skip = page * PAGE_SIZE

  const { data, isLoading } = useQuery({
    queryKey: ['eb-customers', statusFilter, searchQuery, skip, PAGE_SIZE],
    queryFn: () => ebApi.list({
      status: statusFilter || undefined,
      search: searchQuery || undefined,
      skip,
      limit: PAGE_SIZE,
    }),
  })

  const markReady = useMutation({
    mutationFn: (id: number) => ebApi.markReady(id),
    onSuccess: () => {
      toast.success('Marked as READY — NOC can now provision')
      qc.invalidateQueries({ queryKey: ['eb-customers'] })
      qc.invalidateQueries({ queryKey: ['eb-stats'] })
      setSelectedCustomerForReady(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to mark customer READY')),
  })

  const deleteCustomer = useMutation({
    mutationFn: (id: number) => ebApi.deactivate(id),
    onSuccess: () => {
      toast.success('EB customer deleted')
      qc.invalidateQueries({ queryKey: ['eb-customers'] })
      qc.invalidateQueries({ queryKey: ['eb-stats'] })
      setSelectedCustomerForDelete(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to delete EB customer')),
  })

  const rawCustomers = data?.customers ?? []
  const filteredCustomers = rawCustomers.filter((c) =>
    !searchQuery || c.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalCount = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div>
      <PageHeader
        title="EB Customers"
        subtitle={`${totalCount} enterprise broadband customers`}
        actions={
          canManageCustomers ? (
            <Link to="/eb/customers/create">
              <Button size="sm">➕ Add EB Customer</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-8 space-y-6">
        {/* Search, Filter, and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by company name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(0)
                }}
                className="w-64 px-3 py-2 text-xs bg-surface border border-hairline rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="eb-status-filter" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Status:
              </label>
              <select
                id="eb-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(0)
                }}
                className="px-3 py-2 text-xs bg-surface border border-hairline rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Customer Table */}
        {isLoading ? (
          <PageLoader />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Company</Th>
                  <Th>GSTIN</Th>
                  <Th>Status</Th>
                  <Th>Contact</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {!filteredCustomers.length ? (
                  <EmptyRow cols={5} message="No EB customers found matching your criteria." />
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2/50">
                      <Td>
                        <Link
                          to={`/eb/customers/${c.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {c.company_name}
                        </Link>
                      </Td>
                      <Td className="font-mono text-xs">{c.gstin}</Td>
                      <Td>
                        <StatusBadge status={c.status} />
                      </Td>
                      <Td className="text-muted-foreground text-xs">
                        {c.contact_person}
                        <br />
                        {c.contact_phone}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/eb/customers/${c.id}`}>
                            <Button size="xs" variant="secondary">
                              View Details
                            </Button>
                          </Link>
                          {canManageCustomers && !c.is_pushed && (
                            <Link to={`/eb/customers/${c.id}/edit`}>
                              <Button size="xs" variant="secondary">
                                Edit
                              </Button>
                            </Link>
                          )}
                          {canManageCustomers && c.status === 'DRAFT' && (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => setSelectedCustomerForReady(c)}
                            >
                              Mark Ready
                            </Button>
                          )}
                          {canManageCustomers && (
                            <Button
                              size="xs"
                              variant="danger"
                              onClick={() => setSelectedCustomerForDelete(c)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
                <span>
                  Page {page + 1} of {totalPages} ({totalCount} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    ← Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mark Ready Dialog */}
      <ConfirmDialog
        isOpen={Boolean(selectedCustomerForReady)}
        title="Mark EB Customer as READY?"
        description={`Are you sure you want to mark '${selectedCustomerForReady?.company_name}' as READY for NOC provisioning?`}
        confirmText="Mark Ready"
        variant="primary"
        isLoading={markReady.isPending}
        onConfirm={() => selectedCustomerForReady && markReady.mutate(selectedCustomerForReady.id)}
        onClose={() => setSelectedCustomerForReady(null)}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(selectedCustomerForDelete)}
        title="Delete EB Customer?"
        description={`Are you sure you want to delete / deactivate '${selectedCustomerForDelete?.company_name}'?`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteCustomer.isPending}
        onConfirm={() => selectedCustomerForDelete && deleteCustomer.mutate(selectedCustomerForDelete.id)}
        onClose={() => setSelectedCustomerForDelete(null)}
      />
    </div>
  )
}

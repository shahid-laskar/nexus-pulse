import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Building,
} from 'lucide-react'

import { ebApi } from '@/api/eb'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import type { CustomerRead } from '@/types'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',                   label: 'All Statuses' },
  { value: 'DRAFT',              label: 'Draft' },
  { value: 'READY',              label: 'Ready for NOC' },
  { value: 'NETWORK_CONFIGURED', label: 'Network Provisioned (Step 1)' },
  { value: 'PUSHED',             label: 'Live / Pushed' },
  { value: 'ACTIVE',             label: 'Active' },
  { value: 'INACTIVE',           label: 'Inactive' },
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
  const filteredCustomers = useMemo(() => {
    return rawCustomers.filter((c) =>
      !searchQuery || c.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [rawCustomers, searchQuery])

  const totalCount = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="EB Customers Directory"
        subtitle="Manage enterprise broadband client profiles, branding setup, and provisioning states"
        actions={
          canManageCustomers ? (
            <Link to="/eb/customers/create">
              <Button size="sm" variant="primary" className="gap-1.5 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add EB Customer
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Clients</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">In regional scope</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Live on Fleet</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-0.5">
                  {rawCustomers.filter((c) => c.status === 'PUSHED' || c.status === 'ACTIVE').length}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Provisioned &amp; active</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ready for NOC</p>
                <h4 className="text-2xl font-bold text-amber-600 mt-0.5">
                  {rawCustomers.filter((c) => c.status === 'READY').length}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Awaiting router push</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Draft Onboarding</p>
                <h4 className="text-2xl font-bold text-purple-600 mt-0.5">
                  {rawCustomers.filter((c) => c.status === 'DRAFT').length}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Configuration in progress</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Search, Filter, and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(0)
              }}
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="eb-status-filter" className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
              Status:
            </label>
            <select
              id="eb-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)
              }}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer Table */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Building className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Registered EB Accounts ({filteredCustomers.length})</h3>
                <p className="text-[11px] text-slate-500">Showing page {page + 1} of {totalPages}</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <PageLoader />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Company</Th>
                    <Th>GSTIN</Th>
                    <Th>Status</Th>
                    <Th>Contact</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredCustomers.length ? (
                    <EmptyRow cols={5} message="No EB customers found matching your criteria." />
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <Td className="text-xs">
                          <Link
                            to={`/eb/customers/${c.id}`}
                            className="font-bold text-slate-900 hover:text-primary transition-colors"
                          >
                            {c.company_name}
                          </Link>
                        </Td>
                        <Td className="font-mono text-xs text-slate-500">{c.gstin}</Td>
                        <Td>
                          <StatusBadge status={c.status} />
                        </Td>
                        <Td className="text-xs text-slate-600">
                          <div className="font-medium text-slate-900">{c.contact_person}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{c.contact_phone}</div>
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link to={`/eb/customers/${c.id}`}>
                              <Button size="xs" variant="secondary" className="h-7 text-xs gap-1" title="View details">
                                <Eye className="h-3 w-3" />
                                Details
                              </Button>
                            </Link>
                            {canManageCustomers && !c.is_pushed && (
                              <Link to={`/eb/customers/${c.id}/edit`}>
                                <Button size="xs" variant="secondary" className="h-7 text-xs gap-1" title="Edit profile">
                                  <Edit2 className="h-3 w-3" />
                                  Edit
                                </Button>
                              </Link>
                            )}
                            {canManageCustomers && c.status === 'DRAFT' && (
                              <Button
                                size="xs"
                                variant="primary"
                                className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                                onClick={() => setSelectedCustomerForReady(c)}
                                title="Mark ready for NOC"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Mark Ready
                              </Button>
                            )}
                            {canManageCustomers && (
                              <Button
                                size="xs"
                                variant="danger"
                                className="h-7 text-xs gap-1"
                                onClick={() => setSelectedCustomerForDelete(c)}
                                title="Delete customer"
                              >
                                <Trash2 className="h-3 w-3" />
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
            )}
          </CardBody>
        </Card>

        {/* Pagination Controls */}
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-2 text-xs text-slate-600">
            <span>Showing page {page + 1} of {totalPages} ({totalCount} total items)</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="gap-1 h-8 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1 h-8 text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
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

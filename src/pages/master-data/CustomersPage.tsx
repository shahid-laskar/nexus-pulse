import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Users,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Search,
  Eye,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Building,
} from 'lucide-react'

import { customersApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AdoptCustomerModal } from '@/components/noc/AdoptCustomerModal'
import { nocApi } from '@/api/noc'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import type { CustomerRead, InstanceRead } from '@/types'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '',                   label: 'All Customers' },
  { value: 'DRAFT',              label: 'Draft' },
  { value: 'READY',              label: 'Ready for NOC' },
  { value: 'NETWORK_CONFIGURED', label: 'Network Provisioned (Step 1)' },
  { value: 'PUSHED',             label: 'Live / Pushed' },
  { value: 'ACTIVE',             label: 'Active' },
  { value: 'INACTIVE',           label: 'Inactive' },
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

  // Adoption modal state
  const [adoptInstanceId, setAdoptInstanceId] = useState<number | null>(null)
  const [isAdoptModalOpen, setIsAdoptModalOpen] = useState(false)
  const [isInstancePickerOpen, setIsInstancePickerOpen] = useState(false)

  const { data: instances = [] } = useQuery({
    queryKey: ['instances'],
    queryFn: () => nocApi.listInstances(),
    enabled: isInstancePickerOpen,
  })

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
      toast.success('Customer marked as READY for NOC provisioning')
      qc.invalidateQueries({ queryKey: ['customers'] })
      setSelectedForReady(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to mark customer READY')),
  })

  const rawCustomers = data?.customers || []

  const filteredCustomers = useMemo(() => {
    return rawCustomers.filter((c) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        c.company_name.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(q)) ||
        (c.captive_customer_slug && c.captive_customer_slug.toLowerCase().includes(q))
      )
    })
  }, [rawCustomers, searchQuery])

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Customers Master Data"
        subtitle="Manage multi-tenant captive portal customer accounts, branding profiles, and provisioning status"
        actions={
          <div className="flex items-center gap-2">
            {canAccessNOC && (
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 h-8 text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                onClick={() => setIsInstancePickerOpen(true)}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                Adopt from Router
              </Button>
            )}
            {canManageCustomers && (
              <Link to="/customers/create">
                <Button size="sm" variant="primary" className="gap-1.5 h-8 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Add Customer
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Clients</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{data?.total ?? '—'}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">In regional scope</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
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
                <p className="text-[11px] text-slate-400 mt-0.5">Provisioned & running</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ready for Push</p>
                <h4 className="text-2xl font-bold text-amber-600 mt-0.5">
                  {rawCustomers.filter((c) => c.status === 'READY').length}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Awaiting router deploy</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Draft Staging</p>
                <h4 className="text-2xl font-bold text-purple-600 mt-0.5">
                  {rawCustomers.filter((c) => c.status === 'DRAFT').length}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Initial onboarding</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value)
                  setPage(0)
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all',
                  statusFilter === f.value
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, GSTIN, slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-slate-400 text-slate-900"
            />
          </div>
        </div>

        {/* Customer Card Table */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Building className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Customer Records ({filteredCustomers.length})</h3>
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
                    <Th>Company & GSTIN</Th>
                    <Th>Status</Th>
                    <Th>Captive Slug</Th>
                    <Th>Created Date</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <EmptyRow cols={5} message="No customer records match the query" />
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <Td className="text-xs">
                          <Link
                            to={`/customers/${c.id}`}
                            className="font-bold text-slate-900 hover:text-primary transition-colors"
                          >
                            {c.company_name}
                          </Link>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{c.gstin}</div>
                        </Td>
                        <Td>
                          <StatusBadge status={c.status} />
                        </Td>
                        <Td>
                          {c.captive_customer_slug ? (
                            <code className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono border border-slate-200">
                              {c.captive_customer_slug}
                            </code>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-mono">—</span>
                          )}
                        </Td>
                        <Td className="text-xs text-slate-500 font-mono">
                          {new Date(c.created_at).toLocaleDateString()}
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link to={`/customers/${c.id}`}>
                              <Button variant="secondary" size="xs" className="h-7 text-xs gap-1" title="View details">
                                <Eye className="h-3 w-3" />
                                Details
                              </Button>
                            </Link>

                            {canManageCustomers && c.status === 'DRAFT' && (
                              <Button
                                size="xs"
                                variant="secondary"
                                className="h-7 text-xs gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                                onClick={() => setSelectedForReady(c)}
                                title="Mark ready for NOC push"
                              >
                                <CheckCircle2 className="h-3 w-3 text-amber-600" />
                                Mark Ready
                              </Button>
                            )}

                            {canAccessNOC && c.can_be_pushed && (
                              <Link to={`/noc/customers/${c.id}/onboard`}>
                                <Button
                                  size="xs"
                                  variant="primary"
                                  className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  title="Push to Edge Router"
                                >
                                  <ArrowUpRight className="h-3 w-3" />
                                  Push
                                </Button>
                              </Link>
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
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-2 text-xs text-slate-600">
            <span>Showing page {page + 1} of {totalPages} ({data?.total} items total)</span>
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

      <ConfirmDialog
        isOpen={Boolean(selectedForReady)}
        title={`Mark "${selectedForReady?.company_name}" as READY?`}
        description="Are you sure you want to mark this customer as READY? This signals to the NOC team that all onboarding network and captive portal parameters are complete."
        confirmText="Mark as Ready"
        variant="primary"
        isLoading={markReady.isPending}
        onConfirm={() => selectedForReady && markReady.mutate(selectedForReady.id)}
        onClose={() => setSelectedForReady(null)}
      />

      {/* Select Router Dialog for Adoption */}
      {isInstancePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-blue-600" />
                Select Router to Scan
              </h4>
              <button
                onClick={() => setIsInstancePickerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Select an active VyOS gateway to discover and adopt unmanaged captive portal tenants into the Central Portal.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {instances.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  No router instances found.
                </div>
              ) : (
                instances.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => {
                      setAdoptInstanceId(inst.instance_id || inst.id)
                      setIsInstancePickerOpen(false)
                      setIsAdoptModalOpen(true)
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                        {inst.name || `Router #${inst.id}`}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Host: {inst.host}:{inst.ssh_port || 22}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Scan →
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adopt Customer Modal */}
      <AdoptCustomerModal
        instanceId={adoptInstanceId}
        isOpen={isAdoptModalOpen}
        onClose={() => {
          setIsAdoptModalOpen(false)
          setAdoptInstanceId(null)
        }}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['customers'] })
        }}
      />
    </div>
  )
}


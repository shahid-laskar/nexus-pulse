import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Plus,
  Search,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building,
} from 'lucide-react'

import { usersApi } from '@/api/users'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { RoleBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import type { UserRead } from '@/types'

const PAGE_SIZE = 25

export function UsersListPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN'])
  const { canManageUsers } = useAuthStore()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [deactivatingUser, setDeactivatingUser] = useState<UserRead | null>(null)

  const skip = page * PAGE_SIZE

  const { data, isLoading } = useQuery({
    queryKey: ['users', skip, PAGE_SIZE],
    queryFn: () => usersApi.list({ skip, limit: PAGE_SIZE }),
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => {
      toast.success('User deactivated')
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeactivatingUser(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to deactivate user')),
  })

  const usersList = data?.users || []
  const activeCount = useMemo(() => usersList.filter(u => u.is_active).length, [usersList])
  const inactiveCount = useMemo(() => usersList.filter(u => !u.is_active).length, [usersList])

  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchRole = roleFilter === 'ALL' || u.profile.role.name === roleFilter
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !searchQuery ||
        u.username.toLowerCase().includes(q) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      return matchRole && matchSearch
    })
  }, [usersList, roleFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Users Directory"
        subtitle="Manage administrative accounts, role assignments, and regional scope"
        actions={
          canManageUsers ? (
            <Link to="/users/create">
              <Button size="sm" variant="primary" className="gap-1.5 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Create User
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
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Users</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{data?.total ?? '—'}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">In administrative scope</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Accounts</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-0.5">{activeCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Can login to portal</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Inactive Accounts</p>
                <h4 className="text-2xl font-bold text-slate-500 mt-0.5">{inactiveCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Suspended credentials</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <UserX className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Access Scope</p>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">BSNL Multi-Tenant</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Role-based hierarchy</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by username, name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-slate-400 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="CIRCLE_ADMIN">Circle Admin</option>
              <option value="BA_ADMIN">BA Admin</option>
              <option value="BA_NOC_ADMIN">BA NOC Admin</option>
              <option value="BA_EB_ADMIN">BA EB Admin</option>
              <option value="CUSTOMER">Customer Admin</option>
            </select>
          </div>
        </div>

        {/* Users Card Table */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Registered Accounts ({filteredUsers.length})</h3>
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
                    <Th>Username</Th>
                    <Th>Full Name</Th>
                    <Th>Role</Th>
                    <Th>Circle / BA Scope</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <EmptyRow cols={6} message="No users match the search criteria" />
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <Td className="font-semibold text-slate-900 text-xs">
                          {u.username}
                          {u.email && <div className="text-[11px] text-slate-400 font-normal">{u.email}</div>}
                        </Td>
                        <Td className="text-xs text-slate-700 font-medium">
                          {u.full_name || '—'}
                          {u.profile?.designation && (
                            <div className="text-[11px] text-slate-400 font-normal">{u.profile.designation}</div>
                          )}
                        </Td>
                        <Td>
                          <RoleBadge role={u.profile.role.name} />
                        </Td>
                        <Td className="text-xs text-slate-600">
                          {u.profile.circle ? (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              <Globe className="h-3 w-3 text-slate-400" />
                              {u.profile.circle.name} ({u.profile.circle.code})
                              {u.profile.business_area && ` / ${u.profile.business_area.code}`}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Global Scope</span>
                          )}
                        </Td>
                        <Td>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold',
                              u.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', u.is_active ? 'bg-emerald-500' : 'bg-rose-500')} />
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link to={`/users/${u.id}/edit`}>
                              <Button variant="secondary" size="xs" className="h-7 text-xs gap-1" title="Edit user">
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </Button>
                            </Link>
                            {u.is_active && (
                              <Button
                                size="xs"
                                variant="danger"
                                className="h-7 text-xs gap-1"
                                onClick={() => setDeactivatingUser(u)}
                                title="Deactivate user"
                              >
                                <UserX className="h-3 w-3" />
                                Deactivate
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
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-2 text-xs text-slate-600">
            <span>Showing page {page + 1} of {totalPages} ({data?.total} users total)</span>
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
        isOpen={Boolean(deactivatingUser)}
        title={`Deactivate User "${deactivatingUser?.username}"?`}
        description={`Are you sure you want to deactivate account ${deactivatingUser?.full_name || deactivatingUser?.username}? They will no longer be able to log in to the admin portal.`}
        confirmText="Deactivate Account"
        variant="danger"
        isLoading={deactivate.isPending}
        onConfirm={() => deactivatingUser && deactivate.mutate(deactivatingUser.id)}
        onClose={() => setDeactivatingUser(null)}
      />
    </div>
  )
}


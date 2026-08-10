import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { RoleBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'
import type { UserRead } from '@/types'

const PAGE_SIZE = 25

export function UsersListPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN'])
  const { canManageUsers } = useAuthStore()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
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

  const filteredUsers = (data?.users || []).filter(u =>
    !searchQuery ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE)

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${data?.total ?? 0} users in your scope`}
        actions={
          canManageUsers
            ? <Link to="/users/create"><Button size="sm">➕ Create User</Button></Link>
            : undefined
        }
      />

      <div className="p-8 space-y-4">
        {/* Search */}
        <div className="flex justify-end">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-64 focus:outline-none focus:border-[#004aad]"
          />
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Username</Th>
                  <Th>Full Name</Th>
                  <Th>Role</Th>
                  <Th>Circle / BA</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {!filteredUsers.length
                  ? <EmptyRow cols={6} message="No users found" />
                  : filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-surface-2/50">
                      <Td>
                        <span className="font-semibold">{u.username}</span>
                      </Td>
                      <Td>{u.full_name || '—'}</Td>
                      <Td><RoleBadge role={u.profile.role.name} /></Td>
                      <Td className="text-muted-foreground text-xs">
                        {u.profile.circle?.code ?? '—'}
                        {u.profile.business_area && ` / ${u.profile.business_area.code}`}
                      </Td>
                      <Td>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Link to={`/users/${u.id}/edit`}>
                            <Button size="sm" variant="secondary">Edit</Button>
                          </Link>
                          {u.is_active && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setDeactivatingUser(u)}
                            >
                              Deactivate
                            </Button>
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
                <span>Page {page + 1} of {totalPages} ({data?.total} users)</span>
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
        isOpen={Boolean(deactivatingUser)}
        title={`Deactivate User ${deactivatingUser?.username}?`}
        description={`Are you sure you want to deactivate ${deactivatingUser?.full_name || deactivatingUser?.username}?`}
        confirmText="Deactivate"
        variant="danger"
        isLoading={deactivate.isPending}
        onConfirm={() => deactivatingUser && deactivate.mutate(deactivatingUser.id)}
        onClose={() => setDeactivatingUser(null)}
      />
    </div>
  )
}

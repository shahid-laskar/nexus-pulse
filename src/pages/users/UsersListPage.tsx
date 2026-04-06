import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useApiError } from '@/hooks/useApiError'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { RoleBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/auth'

export function UsersListPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN'])
  const { canManageUsers } = useAuthStore()
  const { getError } = useApiError()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  () => usersApi.list({ limit: 200 }),
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => {
      toast.success('User deactivated')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => toast.error(getError(err)),
  })

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

      <div className="p-8">
        {isLoading ? <PageLoader /> : (
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
              {!data?.users.length
                ? <EmptyRow cols={6} message="No users in your scope" />
                : data.users.map(u => (
                  <tr key={u.id} className="hover:bg-[#fafbff]">
                    <Td>
                      <span className="font-semibold">{u.username}</span>
                    </Td>
                    <Td>{u.full_name || '—'}</Td>
                    <Td><RoleBadge role={u.profile.role.name} /></Td>
                    <Td className="text-[#6b7ea8] text-xs">
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
                            loading={deactivate.isPending}
                            onClick={() => {
                              if (confirm(`Deactivate ${u.username}?`)) deactivate.mutate(u.id)
                            }}
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
        )}
      </div>
    </div>
  )
}

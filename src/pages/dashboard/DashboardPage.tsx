import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { customersApi } from '@/api/master-data'
import { ebApi } from '@/api/eb'
import { usersApi } from '@/api/users'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/Badge'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { PageLoader } from '@/components/ui/Spinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export function DashboardPage() {
  useRequireAuth()
  const { canManageUsers, canManageCustomers, canAccessEB, canAccessNOC } = useAuthStore()

  const { data: customers, isLoading: loadingCust } = useQuery({
    queryKey: ['customers', 'dashboard'],
    queryFn:  () => customersApi.list({ limit: 200 }),
    enabled:  canManageCustomers,
  })

  const { data: ebStats } = useQuery({
    queryKey: ['eb-dashboard'],
    queryFn:  ebApi.dashboard,
    enabled:  canAccessEB,
  })

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 'dashboard'],
    queryFn:  () => usersApi.list({ limit: 200 }),
    enabled:  canManageUsers,
  })

  const custs   = customers?.customers ?? []
  const pushed  = custs.filter(c => c.status === 'PUSHED' || c.status === 'ACTIVE').length
  const ready   = custs.filter(c => c.status === 'READY').length
  const draft   = custs.filter(c => c.status === 'DRAFT').length
  const recent  = custs.slice(0, 8)

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="System overview" />

      <div className="p-8">

        {/* Stat grid */}
        {canManageCustomers && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Customers"   value={customers?.total ?? '—'} sub="in your scope" />
            <StatCard label="Provisioned"       value={pushed}   color="green"  sub="live on router" />
            <StatCard label="Ready to Push"     value={ready}    color="yellow" sub="awaiting NOC" />
            <StatCard label="Draft"             value={draft}    color="blue"   sub="in progress" />
          </div>
        )}

        {canManageUsers && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Users"  value={users?.total ?? '—'} sub="portal users" />
            <StatCard label="Active Users" value={users?.users.filter(u => u.is_active).length ?? '—'} color="green" />
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            canManageCustomers && { to: '/customers',        icon: '👥', label: 'Customers' },
            canManageUsers     && { to: '/users',            icon: '👤', label: 'Users' },
            canAccessNOC       && { to: '/noc',              icon: '📡', label: 'NOC Dashboard' },
            canAccessEB        && { to: '/eb',               icon: '🏗️', label: 'EB Dashboard' },
          ].filter(Boolean).map((item: any) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 p-4 bg-white border border-[#d0d8ec] rounded-xl hover:border-[#1a3a6b] hover:bg-[#f4f8ff] transition-all"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-semibold text-[#1a2340]">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Recent customers table */}
        {canManageCustomers && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[#1a2340]">Recent Customers</h2>
              <Link to="/customers" className="text-sm text-[#1a3a6b] font-semibold hover:underline">
                View all →
              </Link>
            </div>
            {loadingCust ? <PageLoader /> : (
              <Table>
                <thead>
                  <tr>
                    <Th>Company</Th>
                    <Th>Status</Th>
                    <Th>Slug</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0
                    ? <EmptyRow cols={4} message="No customers yet" />
                    : recent.map(c => (
                      <tr key={c.id} className="hover:bg-[#fafbff]">
                        <Td>
                          <Link to={`/customers/${c.id}`} className="font-semibold text-[#1a3a6b] hover:underline">
                            {c.company_name}
                          </Link>
                          <div className="text-xs text-[#6b7ea8]">{c.gstin}</div>
                        </Td>
                        <Td><StatusBadge status={c.status} /></Td>
                        <Td>
                          {c.captive_customer_slug
                            ? <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.captive_customer_slug}</code>
                            : <span className="text-[#6b7ea8] text-xs">not provisioned</span>
                          }
                        </Td>
                        <Td className="text-[#6b7ea8] text-xs">
                          {new Date(c.created_at).toLocaleDateString()}
                        </Td>
                      </tr>
                    ))
                  }
                </tbody>
              </Table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
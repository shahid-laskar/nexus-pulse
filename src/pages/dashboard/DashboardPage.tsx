import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users,
  UserCheck,
  Activity,
  Building2,
  Server,
  Wifi,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react'

import { useAuthStore } from '@/store/auth'
import { customersApi } from '@/api/master-data'
import { ebApi } from '@/api/eb'
import { usersApi } from '@/api/users'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/Badge'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
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
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Dashboard"
        subtitle="Operational overview, tenant provisioning pipeline, and fleet metrics"
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* Customer Pipeline Metrics */}
        {canManageCustomers && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Customer & Tenant Pipeline
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Customers"
                value={customers?.total ?? '—'}
                sub="In your administrative scope"
                color="blue"
                icon={Users}
              />
              <StatCard
                label="Provisioned & Live"
                value={pushed}
                sub="Active on VyOS edge routers"
                color="emerald"
                icon={CheckCircle2}
              />
              <StatCard
                label="Ready to Push"
                value={ready}
                sub="Awaiting NOC router push"
                color="amber"
                icon={Clock}
              />
              <StatCard
                label="Draft Staging"
                value={draft}
                sub="Initial onboarding stage"
                color="purple"
                icon={FileText}
              />
            </div>
          </div>
        )}

        {/* User Management Metrics */}
        {canManageUsers && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                User Directory Status
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={users?.total ?? '—'}
                sub="Registered portal accounts"
                color="blue"
                icon={Users}
              />
              <StatCard
                label="Active Accounts"
                value={users?.users.filter(u => u.is_active).length ?? '—'}
                sub="Currently active logins"
                color="emerald"
                icon={UserCheck}
              />
            </div>
          </div>
        )}

        {/* Quick Launch Hub */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Quick Navigation
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              canManageCustomers && { to: '/customers', icon: Users, label: 'Customers Master Data', desc: 'Manage enterprise clients', color: 'text-blue-600 bg-blue-50' },
              canManageUsers     && { to: '/users', icon: UserCheck, label: 'User Directory', desc: 'Manage role assignments', color: 'text-emerald-600 bg-emerald-50' },
              canAccessNOC       && { to: '/noc/operations', icon: Activity, label: 'NOC Operations', desc: 'Live router telemetry & alarms', color: 'text-indigo-600 bg-indigo-50' },
              canAccessNOC       && { to: '/noc/provisioning', icon: Server, label: 'NOC Provisioning', desc: 'VyOS router fleet & onboarding', color: 'text-amber-600 bg-amber-50' },
              canAccessEB        && { to: '/eb', icon: Building2, label: 'EB Dashboard', desc: 'Enterprise broadband workflow', color: 'text-purple-600 bg-purple-50' },
            ].filter(Boolean).map((item: any) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-start justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all"
                >
                  <div className="space-y-1">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2.5 ${item.color}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Customers Card Table */}
        {canManageCustomers && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Recent Customers</h3>
                  <p className="text-[11px] text-slate-500">Recently registered captive portal clients</p>
                </div>
              </div>
              <Link
                to="/customers"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View all customers <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>

            <CardBody className="p-0">
              {loadingCust ? (
                <PageLoader />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Company</Th>
                      <Th>Status</Th>
                      <Th>Captive Slug</Th>
                      <Th>Created Date</Th>
                      <Th className="text-right">Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.length === 0 ? (
                      <EmptyRow cols={5} message="No customers registered yet" />
                    ) : (
                      recent.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <Td>
                            <Link
                              to={`/customers/${c.id}`}
                              className="font-semibold text-slate-900 hover:text-primary transition-colors text-xs"
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
                              <span className="text-slate-400 text-[10.5px] uppercase tracking-wider font-semibold">
                                Not Provisioned
                              </span>
                            )}
                          </Td>
                          <Td className="text-slate-500 text-xs font-mono">
                            {new Date(c.created_at).toLocaleDateString()}
                          </Td>
                          <Td className="text-right">
                            <Link
                              to={`/customers/${c.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              Details <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
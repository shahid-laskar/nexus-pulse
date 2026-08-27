import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ebApi } from '@/api/eb'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/auth'

export function EBDashboardPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])
  const { canManageCustomers } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['eb-stats'],
    queryFn:  ebApi.dashboard,
  })

  return (
    <div>
      <PageHeader
        title="EB Dashboard"
        subtitle="Enterprise broadband customer staging and overview"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/eb/customers">
              <Button size="sm" variant="secondary">📋 View All EB Customers</Button>
            </Link>
            {canManageCustomers && (
              <Link to="/eb/customers/create">
                <Button size="sm">➕ Add EB Customer</Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="p-8 space-y-8">
        {/* KPI Summary Cards */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            KPI Summary
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total EB"  value={stats?.total   ?? '—'} />
            <StatCard label="Draft"     value={stats?.draft   ?? '—'} color="blue"   sub="being filled" />
            <StatCard label="Ready"     value={stats?.ready   ?? '—'} color="yellow" sub="awaiting NOC" />
            <StatCard label="Pushed"    value={stats?.pushed  ?? '—'} color="green"  sub="provisioned" />
          </div>
        </div>

        {/* READY customers - action required banner */}
        {(stats?.ready ?? 0) > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 flex items-center justify-between">
            <div>
              <strong>{stats?.ready} customer(s)</strong> are ready for NOC provisioning.
              Share with the NOC team to complete setup.
            </div>
            <Link to="/eb/customers">
              <Button size="sm" variant="secondary">View Ready Customers</Button>
            </Link>
          </div>
        )}

        {/* Status Breakdown Section */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Status Breakdown
          </h2>
          <div className="p-8 border border-dashed border-hairline rounded-xl bg-surface/50 text-center text-muted-foreground text-sm">
            Coming in Sprint 4
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Recent Activity Feed
          </h2>
          <div className="p-8 border border-dashed border-hairline rounded-xl bg-surface/50 text-center text-muted-foreground text-sm">
            Coming in Sprint 4
          </div>
        </div>
      </div>
    </div>
  )
}

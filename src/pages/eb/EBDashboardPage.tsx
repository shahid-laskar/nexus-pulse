import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  ListFilter,
  ArrowRight,
  TrendingUp,
  Activity,
} from 'lucide-react'

import { ebApi } from '@/api/eb'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
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
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Enterprise Broadband (EB) Hub"
        subtitle="Manage client onboarding pipelines, branding profiles, and NOC provisioning handoffs"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/eb/customers">
              <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs">
                <ListFilter className="h-3.5 w-3.5" />
                View All Clients
              </Button>
            </Link>
            {canManageCustomers && (
              <Link to="/eb/customers/create">
                <Button size="sm" variant="primary" className="gap-1.5 h-8 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Add EB Customer
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total EB Clients"
            value={stats?.total ?? '—'}
            icon={Building2}
            sub="Registered accounts"
            color="blue"
          />
          <StatCard
            label="Draft In-Progress"
            value={stats?.draft ?? '—'}
            icon={FileText}
            sub="Being configured"
            color="purple"
          />
          <StatCard
            label="Ready for NOC"
            value={stats?.ready ?? '—'}
            icon={Clock}
            sub="Awaiting router deploy"
            color="yellow"
          />
          <StatCard
            label="Live on Router Fleet"
            value={stats?.pushed ?? '—'}
            icon={CheckCircle2}
            sub="Active on VyOS"
            color="green"
          />
        </div>

        {/* READY customers - action required banner */}
        {(stats?.ready ?? 0) > 0 && (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <strong>{stats?.ready} enterprise client(s)</strong> are marked READY for NOC provisioning.
                <p className="text-[11px] text-amber-700 mt-0.5">The NOC team can push these profiles to the edge router fleet.</p>
              </div>
            </div>
            <Link to="/eb/customers">
              <Button size="xs" variant="secondary" className="gap-1 text-amber-800 bg-white hover:bg-amber-100 border-amber-300 h-7 text-xs whitespace-nowrap">
                View Ready Clients
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* Quick Links & Pipeline Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Onboarding Pipeline</h3>
                <p className="text-[11px] text-slate-500">Lifecycle progression of customer onboarding</p>
              </div>
            </CardHeader>
            <CardBody className="p-5 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-700">1. Draft Profile Created</span>
                <span className="font-bold text-purple-700">{stats?.draft ?? 0} Accounts</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-700">2. Customer Marked Ready</span>
                <span className="font-bold text-amber-700">{stats?.ready ?? 0} Accounts</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-700">3. Pushed to Router &amp; Active</span>
                <span className="font-bold text-emerald-700">{stats?.pushed ?? 0} Accounts</span>
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">EB Action Center</h3>
                <p className="text-[11px] text-slate-500">Operational tasks and management shortcuts</p>
              </div>
            </CardHeader>
            <CardBody className="p-5 flex flex-col gap-3">
              <Link to="/eb/customers/create" className="p-3 rounded-lg border border-slate-200 hover:border-primary/50 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Register New Customer</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Create a new corporate captive portal tenant profile</p>
                </div>
                <Plus className="h-4 w-4 text-slate-400" />
              </Link>
              <Link to="/eb/customers" className="p-3 rounded-lg border border-slate-200 hover:border-primary/50 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Manage Existing Clients</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Edit branding, contact information, and QoS limits</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

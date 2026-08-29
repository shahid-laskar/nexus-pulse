import { useState } from 'react'
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
  GitPullRequest,
  AlertCircle,
  History,
  Eye,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

import { ebApi } from '@/api/eb'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/auth'
import { ChangeRequestStatusBadge, ChangeRequestTypeBadge } from '@/components/ui/Badge'
import { ChangeRequestDetailModal } from '@/pages/eb/ChangeRequestDetailModal'
import { EBChangeRequestModal } from '@/pages/eb/EBChangeRequestModal'
import type { ChangeRequest } from '@/types'

export function EBDashboardPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])
  const { canManageCustomers } = useAuthStore()

  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [resubmitTarget, setResubmitTarget] = useState<ChangeRequest | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['eb-stats'],
    queryFn:  ebApi.dashboard,
  })

  // Fetch all change requests across customers
  const { data: changeRequests = [], refetch: refetchCRs } = useQuery({
    queryKey: ['eb-all-change-requests'],
    queryFn: () => ebApi.listAllChangeRequests(),
  })

  // Fetch recent audit logs
  const { data: auditData } = useQuery({
    queryKey: ['eb-dashboard-audit-logs'],
    queryFn: () => ebApi.listAuditLogs({ limit: 8 }),
  })

  // Fetch customers lookup
  const { data: customersData } = useQuery({
    queryKey: ['eb-customers-lookup'],
    queryFn: () => ebApi.list({ limit: 100 }),
  })

  const customerMap = new Map<number, string>()
  customersData?.customers?.forEach((c) => customerMap.set(c.id, c.company_name))

  const pendingCRs = changeRequests.filter((r) => r.status === 'PENDING' || r.status === 'IN_REVIEW')
  const needsInfoCRs = changeRequests.filter((r) => r.status === 'NEEDS_INFO')
  const appliedCRs = changeRequests.filter((r) => r.status === 'APPLIED')

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Enterprise Broadband (EB) Hub"
        subtitle="Manage client onboarding pipelines, branding profiles, and NOC provisioning handoffs"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/eb/change-requests">
              <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs">
                <GitPullRequest className="h-3.5 w-3.5" />
                Change Requests ({changeRequests.length})
              </Button>
            </Link>
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

        {/* Action Required Banners */}
        {needsInfoCRs.length > 0 && (
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-200/80 text-amber-800 shrink-0">
                <AlertCircle className="h-4.5 w-4.5" />
              </span>
              <div>
                <strong className="text-amber-950 font-bold">{needsInfoCRs.length} Change Request(s) Require Revisions</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  NOC returned change requests for more info. Review the feedback and resubmit.
                </p>
              </div>
            </div>
            <Link to="/eb/change-requests">
              <Button size="xs" variant="secondary" className="gap-1 text-amber-900 bg-white hover:bg-amber-100 border-amber-300 h-7 text-xs font-semibold whitespace-nowrap">
                Review &amp; Resubmit
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {(stats?.ready ?? 0) > 0 && (
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-700">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <strong>{stats?.ready} enterprise client(s)</strong> are marked READY for NOC provisioning.
                <p className="text-[11px] text-blue-700 mt-0.5">The NOC team can push these profiles to the edge router fleet.</p>
              </div>
            </div>
            <Link to="/eb/customers">
              <Button size="xs" variant="secondary" className="gap-1 text-blue-800 bg-white hover:bg-blue-100 border-blue-300 h-7 text-xs whitespace-nowrap">
                View Ready Clients
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* Change Request Pipeline & Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Change Request Summary Card */}
          <Card className="border-slate-200 shadow-2xs lg:col-span-1">
            <CardHeader className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <GitPullRequest className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Change Requests Overview</h3>
                  <p className="text-[11px] text-slate-500">Live modifications across clients</p>
                </div>
              </div>
              <Link to="/eb/change-requests" className="text-[11px] font-semibold text-primary hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardBody className="p-5 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Pending NOC Review
                </span>
                <span className="font-bold text-blue-700">{pendingCRs.length} Requests</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Action Required (Needs Info)
                </span>
                <span className="font-bold text-amber-700">{needsInfoCRs.length} Requests</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Applied &amp; Active
                </span>
                <span className="font-bold text-emerald-700">{appliedCRs.length} Requests</span>
              </div>
            </CardBody>
          </Card>

          {/* Cross-Customer Recent Activity / Audit Feed */}
          <Card className="border-slate-200 shadow-2xs lg:col-span-2">
            <CardHeader className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <History className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Recent Customer Activity &amp; Audit Log</h3>
                  <p className="text-[11px] text-slate-500">Live operational events across your business area</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Immutable Event Trail</span>
            </CardHeader>
            <CardBody className="p-0">
              {(!auditData?.items || auditData.items.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <History className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  No recent activity recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                  {auditData.items.map((log) => {
                    const isCR = log.category === 'CHANGE_REQUEST'
                    const isApplied = log.action === 'CR_APPLIED' || log.action === 'CUSTOMER_ONBOARDED'
                    const isAlert = log.action === 'CR_RETURNED' || log.action === 'CR_REJECTED'

                    return (
                      <div key={log.id} className="p-3.5 px-5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-lg shrink-0 mt-0.5 ${
                              isApplied
                                ? 'bg-emerald-100 text-emerald-700'
                                : isAlert
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isCR ? <GitPullRequest className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {log.customer_name && (
                                <span className="font-bold text-slate-900 truncate">
                                  {log.customer_name}
                                </span>
                              )}
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {log.action.replace('CR_', '').replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] truncate mt-0.5" title={log.summary}>
                              {log.summary}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-slate-400 block">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {log.actor_username || 'system'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Action Center & Lifecycle Progression */}
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
              <Link to="/eb/change-requests" className="p-3 rounded-lg border border-slate-200 hover:border-primary/50 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Change Requests Directory</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">View and resubmit policy modifications across clients</p>
                </div>
                <GitPullRequest className="h-4 w-4 text-slate-400" />
              </Link>
              <Link to="/eb/customers/create" className="p-3 rounded-lg border border-slate-200 hover:border-primary/50 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Register New Customer</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Create a new corporate captive portal tenant profile</p>
                </div>
                <Plus className="h-4 w-4 text-slate-400" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Details & Diff Modal */}
      <ChangeRequestDetailModal
        request={selectedRequest}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedRequest(null)
        }}
        onResubmit={(req) => {
          setIsDetailOpen(false)
          setResubmitTarget(req)
        }}
      />

      {/* Resubmit Modal */}
      {resubmitTarget && (
        <EBChangeRequestModal
          isOpen={true}
          onClose={() => setResubmitTarget(null)}
          customer={{ id: resubmitTarget.customer_id } as any}
          resubmitItem={resubmitTarget}
          onSuccess={() => {
            setResubmitTarget(null)
            refetchCRs()
          }}
        />
      )}
    </div>
  )
}

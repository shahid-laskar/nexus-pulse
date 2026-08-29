import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  History,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  GitPullRequest,
  Layers,
  Router,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  User,
  Building2,
} from 'lucide-react'

import { nocApi } from '@/api/noc'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { AuditLog } from '@/types'

export function AuditLogsFeed() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['noc-audit-logs', categoryFilter, actionFilter],
    queryFn: () =>
      nocApi.listAuditLogs({
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        limit: 100,
      }),
  })

  const logs: AuditLog[] = data?.items || []

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      (log.customer_name || '').toLowerCase().includes(term) ||
      (log.summary || '').toLowerCase().includes(term) ||
      (log.actor_username || '').toLowerCase().includes(term) ||
      (log.action || '').toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, actor, summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary w-72 shadow-2xs"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs font-medium text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="CHANGE_REQUEST">Change Requests</option>
            <option value="PROVISIONING">Router Provisioning</option>
            <option value="LIFECYCLE">Customer Lifecycle</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs font-medium text-slate-700"
          >
            <option value="ALL">All Actions</option>
            <option value="CR_APPLIED">CR Applied</option>
            <option value="CR_SUBMITTED">CR Submitted</option>
            <option value="CR_RETURNED">CR Returned</option>
            <option value="CR_REJECTED">CR Rejected</option>
            <option value="NETWORK_PROVISIONED">Network Provisioned (Step 1)</option>
            <option value="NETWORK_ROLLED_BACK">Network Rolled Back</option>
            <option value="CUSTOMER_ONBOARDED">Customer Onboarded (Step 2)</option>
            <option value="CUSTOMER_DEBOARDED">Customer Deboarded</option>
            <option value="CUSTOMER_MARKED_READY">Marked Ready</option>
          </select>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => refetch()}
          className="gap-1.5 h-8 text-xs font-semibold"
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </Button>
      </div>

      {/* Audit Log Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900">
              System Audit Stream ({filteredLogs.length} Events)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Immutable Audit Store</span>
        </CardHeader>

        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No audit logs found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Summary</th>
                    <th className="px-5 py-3">Actor &amp; Role</th>
                    <th className="px-5 py-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const isApplied = log.action === 'CR_APPLIED' || log.action === 'CUSTOMER_ONBOARDED' || log.action === 'NETWORK_PROVISIONED'
                    const isWarning = log.action === 'CR_RETURNED' || log.action === 'CR_REJECTED' || log.action === 'NETWORK_ROLLED_BACK' || log.action === 'CUSTOMER_DEBOARDED'

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                              isApplied
                                ? 'bg-emerald-100 text-emerald-800'
                                : isWarning
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.action.replace('CR_', '').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          {log.customer_name ? (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {log.customer_name}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 max-w-md">
                          <div className="truncate" title={log.summary}>
                            {log.summary}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {log.actor_username || 'system'}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase font-medium">
                            {log.actor_role}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                            {log.category}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

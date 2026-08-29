import React from 'react'
import {
  Network,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import type { InstanceTopologyResponse } from '@/types'

interface RouterTopologyCardProps {
  topology?: InstanceTopologyResponse
  isLoading?: boolean
  selectedCvlan?: number | string
  currentCustomerId?: number
  onSelectCvlan?: (cvlan: number) => void
  className?: string
}

export function RouterTopologyCard({
  topology,
  isLoading,
  selectedCvlan,
  currentCustomerId,
  onSelectCvlan,
  className,
}: RouterTopologyCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('border-blue-200 bg-blue-50/30', className)}>
        <CardBody className="p-5 flex items-center justify-center gap-2 text-xs text-blue-700">
          <Spinner className="h-4 w-4" />
          <span>Fetching real-time router topology & allocation matrix...</span>
        </CardBody>
      </Card>
    )
  }

  if (!topology) return null

  // Exclude current customer from collision check (a customer cannot conflict with itself)
  const otherTenants = currentCustomerId
    ? topology.tenants.filter((t) => t.id !== currentCustomerId)
    : topology.tenants

  const collidingTenant = Boolean(selectedCvlan)
    ? otherTenants.find((t) => t.cvlan === Number(selectedCvlan))
    : null

  const isCvlanCollision = Boolean(collidingTenant)

  const totalCapacityMbps = topology.wan_max_bandwidth.toLowerCase().includes('gbit')
    ? (parseInt(topology.wan_max_bandwidth) || 1) * 1000
    : parseInt(topology.wan_max_bandwidth) || 1000

  const bwPct = Math.min(
    100,
    Math.round((topology.total_committed_mbps / (totalCapacityMbps || 1000)) * 100)
  )

  const freeCvlansCount = Math.max(
    0,
    topology.cvlan_end - topology.cvlan_start + 1 - topology.allocated_cvlans.length
  )

  return (
    <Card className={cn('border-slate-200 shadow-xs overflow-hidden', className)}>
      <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            #{topology.instance_id}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{topology.name || ('Router #' + topology.instance_id)}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </h4>
            <p className="text-[11px] font-mono text-slate-500">
              {topology.host}:{topology.ssh_port} • WAN: {topology.wan_interface}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Online
          </span>
        </div>
      </CardHeader>

      <CardBody className="p-4 space-y-4 text-xs">
        {/* KPI Mini Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Active Tenants
            </span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">
              {topology.total_tenants}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Service VLAN
            </span>
            <span className="text-sm font-mono font-bold text-teal-700 mt-0.5 block">
              SVLAN {topology.svlan}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Next Free CVLAN
            </span>
            <span className="text-sm font-mono font-bold text-indigo-600 mt-0.5 block">
              {topology.next_available_cvlan ? (
                <button
                  type="button"
                  onClick={() => onSelectCvlan && topology.next_available_cvlan && onSelectCvlan(topology.next_available_cvlan)}
                  className="hover:underline flex items-center gap-1"
                  title="Click to apply next available CVLAN"
                >
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  {topology.next_available_cvlan}
                </button>
              ) : (
                'Exhausted'
              )}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Supernet Pool
            </span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-0.5 block truncate" title={topology.supernet_cidr}>
              {topology.supernet_cidr}
            </span>
          </div>
        </div>

        {/* Bandwidth Utilization Bar */}
        <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-medium text-slate-600 flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              Committed Bandwidth Load
            </span>
            <span className="font-mono font-bold text-slate-900">
              {topology.total_committed_mbps} Mbps / {topology.wan_max_bandwidth} ({bwPct}%)
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                bwPct > 85 ? 'bg-rose-500' : bwPct > 60 ? 'bg-amber-500' : 'bg-blue-600'
              )}
              style={{ width: bwPct + '%' }}
            />
          </div>
        </div>

        {/* Unmanaged Tenants Alert */}
        {topology.unmanaged_count && topology.unmanaged_count > 0 ? (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-700">⚠️</span>
              <span className="text-amber-900 font-medium">
                <strong>{topology.unmanaged_count} Unmanaged Tenant(s)</strong> detected on router.
                Their CVLANs & subnets are locked to prevent collision.
              </span>
            </div>
          </div>
        ) : null}

        {/* In-Use CVLAN & Interface Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5 text-primary" />
              Allocated CVLANs ({topology.allocated_cvlans.length} in use, {freeCvlansCount} free)
            </span>
            <span className="text-slate-400 font-mono text-[10.5px]">
              Allowed: {topology.cvlan_start}–{topology.cvlan_end}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200/70">
            {topology.allocated_cvlans.length === 0 ? (
              <span className="text-[11px] text-slate-400 italic">
                No CVLANs currently assigned on this router. All {freeCvlansCount} tags available.
              </span>
            ) : (
              topology.tenants.map((t) => {
                const isCurrentCustomer = currentCustomerId && t.id === currentCustomerId
                const isSelected = selectedCvlan && Number(selectedCvlan) === t.cvlan
                return (
                  <div
                    key={t.id}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-all',
                      isCurrentCustomer
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/40 font-semibold'
                        : isSelected
                          ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-400/40'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    )}
                    title={t.company_name + ' (Subnet: ' + (t.subnet_cidr || 'N/A') + ', Rate: ' + t.max_bandwidth + ')'}
                  >
                    <span className="font-bold">{t.cvlan}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                      {isCurrentCustomer ? '(This Tenant)' : t.company_name}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Collision Warning Banner */}
        {isCvlanCollision && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">CVLAN Conflict Warning</span>
              <span>
                CVLAN <strong>{selectedCvlan}</strong> is already assigned to tenant{' '}
                <strong>{collidingTenant?.company_name || 'Another Customer'}</strong> (Subnet:{' '}
                {collidingTenant?.subnet_cidr || '—'}) on interface{' '}
                <code className="font-mono font-semibold text-amber-800">{collidingTenant?.interface}.{topology.svlan}.{selectedCvlan}</code>.
              </span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

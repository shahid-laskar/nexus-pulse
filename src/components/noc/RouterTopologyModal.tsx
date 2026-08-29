import React, { useState } from 'react'
import {
  X,
  Server,
  Network,
  Cpu,
  CheckCircle2,
  Users,
  HardDrive,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { nocApi } from '@/api/noc'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Table, Th, Td } from '@/components/ui/Table'
import { cn } from '@/lib/utils'
import { AdoptCustomerModal } from './AdoptCustomerModal'
import type { UnintegratedCustomer } from '@/types'

interface RouterTopologyModalProps {
  instanceId: number | null
  isOpen: boolean
  onClose: () => void
  onOnboardForInstance?: (instanceId: number) => void
}

export function RouterTopologyModal({
  instanceId,
  isOpen,
  onClose,
  onOnboardForInstance,
}: RouterTopologyModalProps) {
  const [isAdoptModalOpen, setIsAdoptModalOpen] = useState(false)
  const [selectedUnmanaged, setSelectedUnmanaged] = useState<UnintegratedCustomer | null>(null)

  const { data: topology, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['instance-topology', instanceId],
    queryFn: () => nocApi.getInstanceTopology(instanceId!),
    enabled: Boolean(isOpen && instanceId),
  })

  if (!isOpen || !instanceId) return null

  const totalCapacityMbps = topology?.wan_max_bandwidth.toLowerCase().includes('gbit')
    ? (parseInt(topology.wan_max_bandwidth) || 1) * 1000
    : parseInt(topology?.wan_max_bandwidth || '1000') || 1000

  const bwPct = topology
    ? Math.min(
        100,
        Math.round((topology.total_committed_mbps / (totalCapacityMbps || 1000)) * 100)
      )
    : 0

  const freeCvlansCount = topology
    ? Math.max(
        0,
        topology.cvlan_end - topology.cvlan_start + 1 - topology.allocated_cvlans.length
      )
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shadow-xs">
              #{instanceId}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {topology?.name || ('VyOS Router #' + instanceId)}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active Gateway
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Host: {topology?.host || '—'}:{topology?.ssh_port || 22} • Identifier: {topology?.identifier || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              className="h-8 text-xs gap-1"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Spinner className="h-8 w-8" />
              <p className="text-xs">Loading complete router topology and tenant roster...</p>
            </div>
          ) : !topology ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Unable to load router topology.
            </div>
          ) : (
            <>
              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Active Tenants
                  </span>
                  <p className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-1">
                    {topology.total_tenants}
                    <span className="text-xs font-normal text-slate-400">customers</span>
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    VLAN Architecture
                  </span>
                  <p className="text-sm font-mono font-bold text-teal-700 mt-1">
                    SVLAN {topology.svlan}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    CVLANs: {topology.cvlan_start}–{topology.cvlan_end} ({freeCvlansCount} free)
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    IP Supernet Pool
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-1">
                    {topology.supernet_cidr}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {topology.allocated_subnets.length} subnets carved
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Bandwidth Load
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-1">
                    {topology.total_committed_mbps} / {topology.wan_max_bandwidth}
                  </p>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        bwPct > 85 ? 'bg-rose-500' : bwPct > 60 ? 'bg-amber-500' : 'bg-blue-600'
                      )}
                      style={{ width: bwPct + '%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Interface & QinQ Tree Summary */}
              <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs mb-2">
                  <Network className="h-4 w-4 text-blue-600" />
                  QinQ Interface Tree & Trunk Hierarchy
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <div className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-slate-800 shadow-2xs font-semibold">
                    Physical: eth0
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                  <div className="px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 shadow-2xs font-semibold">
                    SVLAN {topology.svlan} (vif-s {topology.svlan})
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                  <div className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 shadow-2xs font-semibold">
                    {topology.allocated_cvlans.length} CVLAN Endpoints Provisioned
                  </div>
                </div>
              </div>

              {/* Tenant Roster Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Active Tenant Roster on this Router ({topology.tenants.length})
                  </h4>
                  <span className="text-xs text-slate-500">
                    Next Free CVLAN:{' '}
                    <strong className="font-mono text-indigo-600">
                      {topology.next_available_cvlan || 'None'}
                    </strong>
                  </span>
                </div>

                {topology.unmanaged_count && topology.unmanaged_count > 0 ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        ⚠️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-900">
                          {topology.unmanaged_count} Unmanaged Tenant(s) Detected on Router
                        </div>
                        <div className="text-[11px] text-amber-700">
                          These customers exist in router configuration but are not yet registered in Central Web Portal.
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="xs"
                      className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs"
                      onClick={() => {
                        setSelectedUnmanaged(null)
                        setIsAdoptModalOpen(true)
                      }}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Review & Adopt
                    </Button>
                  </div>
                ) : null}

                {topology.tenants.length === 0 ? (
                  <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    No active customers are provisioned on this router yet.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <Table>
                      <thead>
                        <tr>
                          <Th>Customer / Tenant</Th>
                          <Th>QinQ Interface</Th>
                          <Th>CVLAN</Th>
                          <Th>Subnet / Gateway</Th>
                          <Th>Bandwidth</Th>
                          <Th>Status</Th>
                          <Th className="text-right">Action</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {topology.tenants.map((t, idx) => (
                          <tr
                            key={t.id || `unmanaged-${idx}`}
                            className={cn(
                              'hover:bg-slate-50/70 transition-colors',
                              t.is_unmanaged && 'bg-amber-50/30'
                            )}
                          >
                            <Td className="font-semibold text-slate-900 text-xs">
                              {t.company_name}
                              <span className="text-[10.5px] font-mono text-slate-400 block font-normal">
                                {t.is_unmanaged ? `Slug: ${t.slug}` : `ID #${t.id}`}
                              </span>
                            </Td>
                            <Td className="font-mono text-xs text-slate-700">
                              {t.interface}.{t.svlan}.{t.cvlan || '—'}
                            </Td>
                            <Td className="font-mono text-xs font-bold text-teal-700">
                              {t.cvlan ?? '—'}
                            </Td>
                            <Td className="font-mono text-xs text-slate-600">
                              <div>{t.subnet_cidr || '—'}</div>
                              {t.gateway_ip && (
                                <div className="text-[10px] text-slate-400">GW: {t.gateway_ip}</div>
                              )}
                            </Td>
                            <Td className="font-mono text-xs text-slate-700">
                              {t.max_bandwidth}
                            </Td>
                            <Td>
                              {t.is_unmanaged ? (
                                <span className="px-2 py-0.5 text-[10.5px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                  UNMANAGED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {t.status}
                                </span>
                              )}
                            </Td>
                            <Td className="text-right">
                              {t.is_unmanaged && (
                                <Button
                                  variant="primary"
                                  size="xs"
                                  className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white gap-1"
                                  onClick={() => {
                                    setSelectedUnmanaged({
                                      instance_id: instanceId,
                                      name: t.company_name,
                                      slug: t.slug || '',
                                      qinq_interface: t.interface,
                                      wan_interface: topology.wan_interface,
                                      svlan: t.svlan,
                                      cvlan: t.cvlan,
                                      start_ip: t.dhcp_range ? t.dhcp_range.split('–')[0].trim() : null,
                                      end_ip: t.dhcp_range ? t.dhcp_range.split('–')[1]?.trim() : null,
                                      suggested_subnet_cidr: t.subnet_cidr,
                                      suggested_gateway_ip: t.gateway_ip,
                                      is_active: true,
                                    })
                                    setIsAdoptModalOpen(true)
                                  }}
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  Adopt
                                </Button>
                              )}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Router #{instanceId} • Managed via BSNL Captive Portal Backend
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>

      <AdoptCustomerModal
        instanceId={instanceId}
        initialCustomer={selectedUnmanaged}
        isOpen={isAdoptModalOpen}
        onClose={() => {
          setIsAdoptModalOpen(false)
          setSelectedUnmanaged(null)
        }}
        onSuccess={() => {
          refetch()
        }}
      />
    </div>
  )
}

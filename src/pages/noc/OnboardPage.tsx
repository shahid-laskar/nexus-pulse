import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import {
  Sparkles,
  Network,
  Server,
  Play,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'

import { customersApi } from '@/api/master-data'
import { nocApi } from '@/api/noc'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RouterTopologyCard } from '@/components/noc/RouterTopologyCard'
import type { InstanceRead, NetworkProvisionPayload } from '@/types'

const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.){3}(25[0-5]|(2[0-4]|1\d|[1-9]|)\d)$/
const cidrRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.){3}(25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\/([0-9]|[1-2][0-9]|3[0-2])$/

const schema = z.object({
  captive_instance_id: z.coerce.number().min(1, 'Select a router instance'),
  qinq_interface:      z.string().min(2, 'QinQ interface required'),
  wan_interface:       z.string().min(2, 'WAN interface required'),
  svlan:               z.coerce.number().min(1, 'Min S-VLAN is 1').max(4094, 'Max S-VLAN is 4094'),
  cvlan:               z.coerce.number().min(1, 'Min C-VLAN is 1').max(4094, 'Max C-VLAN is 4094'),
  subnet_cidr:         z.string().regex(cidrRegex, 'Valid Subnet CIDR required (e.g. 10.6.101.0/24)'),
  gateway_ip:          z.string().regex(ipv4Regex, 'Valid Gateway IPv4 required'),
  dhcp_range_start:    z.string().regex(ipv4Regex, 'Valid DHCP Start IPv4 required'),
  dhcp_range_end:      z.string().regex(ipv4Regex, 'Valid DHCP End IPv4 required'),
  dhcp_lease_time:     z.coerce.number().min(60, 'Min lease time is 60s').default(900),
  dns_forward_enabled: z.boolean().default(true),
  qos_mode:            z.string().default('per_user'),
  max_bandwidth:       z.string().default('1gbit'),
})

type NetForm = z.infer<typeof schema>

export function OnboardPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const { id } = useParams<{ id: string }>()
  const customerId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingFormData, setPendingFormData]   = useState<NetForm | null>(null)
  const [isCarvingSubnet, setIsCarvingSubnet]   = useState(false)
  const [carvedInfo, setCarvedInfo]             = useState<any | null>(null)

  const { data: customer, isLoading: loadingCustomer, refetch: refetchCustomer } = useQuery({
    queryKey: ['customers', customerId],
    queryFn:  () => customersApi.get(customerId),
    enabled:  Boolean(customerId),
  })

  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: ['noc-instances'],
    queryFn:  () => nocApi.listInstances(),
  })

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<NetForm>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      qos_mode:            customer?.qos_mode || 'per_user',
      max_bandwidth:       customer?.max_bandwidth || '100mbit',
      qinq_interface:      customer?.qinq_interface || 'eth0',
      wan_interface:       customer?.wan_interface || 'eth0',
      dhcp_lease_time:     customer?.dhcp_lease_time || 900,
      dns_forward_enabled: customer?.dns_forward_enabled ?? true,
    },
    values: customer ? {
      captive_instance_id: customer.captive_instance_id ?? 1,
      qinq_interface:      customer.qinq_interface || 'eth0',
      wan_interface:       customer.wan_interface  || 'eth0',
      svlan:               customer.svlan ?? 100,
      cvlan:               customer.cvlan ?? 1001,
      subnet_cidr:         customer.subnet_cidr || '10.2.1.0/24',
      gateway_ip:          customer.gateway_ip || '10.2.1.1',
      dhcp_range_start:    customer.dhcp_range_start || customer.start_ip || '10.2.1.5',
      dhcp_range_end:      customer.dhcp_range_end || customer.end_ip || '10.2.1.254',
      dhcp_lease_time:     customer.dhcp_lease_time || 900,
      dns_forward_enabled: customer.dns_forward_enabled ?? true,
      qos_mode:            customer.qos_mode || 'per_user',
      max_bandwidth:       customer.max_bandwidth || '100mbit',
    } : undefined,
  })

  const watchedInstanceId = useWatch({ control, name: 'captive_instance_id' }) || customer?.captive_instance_id || 1
  const watchedCvlan = useWatch({ control, name: 'cvlan' })

  const { data: routerTopology, isLoading: loadingTopology } = useQuery({
    queryKey: ['instance-topology', watchedInstanceId],
    queryFn:  () => nocApi.getInstanceTopology(Number(watchedInstanceId)),
    enabled:  Boolean(watchedInstanceId),
  })

  // Auto-sync router defaults when instance is chosen
  useEffect(() => {
    if (routerTopology) {
      if (!customer?.svlan || customer.status === 'READY' || customer.status === 'DRAFT') {
        setValue('svlan', routerTopology.svlan)
        setValue('wan_interface', routerTopology.wan_interface)
        if (routerTopology.next_available_cvlan && (!customer?.cvlan || customer.status === 'READY')) {
          setValue('cvlan', routerTopology.next_available_cvlan)
        }
      }
    }
  }, [routerTopology, customer, setValue])

  const handleAutoCarveSubnet = async () => {
    try {
      setIsCarvingSubnet(true)
      const res = await nocApi.getNextSubnet(Number(watchedInstanceId), {
        concurrent_users: customer?.concurrent_users ?? 0,
        total_users:      customer?.total_users ?? 100,
        buffer_pct:       0.25,
      })
      if (res.subnet_cidr && res.gateway_ip && res.dhcp_range_start && res.dhcp_range_end) {
        setValue('subnet_cidr', res.subnet_cidr)
        setValue('gateway_ip', res.gateway_ip)
        setValue('dhcp_range_start', res.dhcp_range_start)
        setValue('dhcp_range_end', res.dhcp_range_end)
        setCarvedInfo(res)
        toast.success('Carved /' + res.subnet_prefix_len + ' subnet: ' + res.subnet_cidr + ' (' + res.client_assignable_ips + ' client IPs)')
      }
    } catch (err) {
      toast.error('Subnet calculation failed: ' + extractErrorMessage(err))
    } finally {
      setIsCarvingSubnet(false)
    }
  }

  const provisionNetworkMutation = useMutation({
    mutationFn: (data: NetForm) => {
      const payload: NetworkProvisionPayload = {
        instance_id:         data.captive_instance_id,
        interface:           data.qinq_interface,
        svlan:               data.svlan,
        cvlan:               data.cvlan,
        wan_interface:       data.wan_interface,
        subnet_cidr:         data.subnet_cidr,
        gateway_ip:          data.gateway_ip,
        dhcp_range_start:    data.dhcp_range_start,
        dhcp_range_end:      data.dhcp_range_end,
        dhcp_lease_time:     data.dhcp_lease_time,
        dns_forward_enabled: data.dns_forward_enabled,
        qos_mode:            data.qos_mode,
        max_bandwidth:       data.max_bandwidth,
      }
      return nocApi.provisionCustomerNetwork(customerId, payload)
    },
    onSuccess: (res) => {
      toast.success('VyOS network provisioned (Interface + DHCP + DNS)! Customer status: ' + res.status)
      refetchCustomer()
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => {
      toast.error('Network provisioning failed: ' + extractErrorMessage(err))
    },
  })

  const onboardMutation = useMutation({
    mutationFn: () => nocApi.onboard(customerId),
    onSuccess: (res) => {
      toast.success(res.company_name + ' successfully activated on router! Slug: ' + res.slug)
      qc.invalidateQueries({ queryKey: ['customers'] })
      setShowConfirmModal(false)
      navigate('/noc')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to activate customer on router'))
      setShowConfirmModal(false)
    },
  })

  const onSubmitForm = (data: NetForm) => {
    setPendingFormData(data)
    setShowConfirmModal(true)
  }

  const handleDeployStep1Only = async (data: NetForm) => {
    try {
      await provisionNetworkMutation.mutateAsync(data)
    } catch (err) {
      // Handled in mutation onError
    }
  }

  const executeFullOnboarding = async () => {
    if (!pendingFormData) return
    try {
      await provisionNetworkMutation.mutateAsync(pendingFormData)
      await onboardMutation.mutateAsync()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Onboarding failed'))
    }
  }

  if (loadingCustomer || loadingInstances) return <PageLoader />
  if (!customer) return <div className="p-8 text-slate-500">Customer not found</div>

  const isProvisioning = provisionNetworkMutation.isPending || onboardMutation.isPending
  const isNetworkConfigured = customer.status === 'NETWORK_CONFIGURED' || customer.status === 'PUSHED'

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={'Provision Network: ' + customer.company_name}
        subtitle="Configure IP Pool, DHCP Server, DNS Forwarding, and Router Rules."
      />
      <div className="p-6 lg:p-8 max-w-5xl space-y-6">
        
        {/* Customer Status Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{customer.company_name}</h2>
              <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-slate-100 text-slate-700">
                {customer.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              GSTIN: <span className="font-mono">{customer.gstin}</span> • Total Users: <strong>{customer.total_users}</strong> • Concurrent Users: <strong>{customer.concurrent_users || customer.total_users}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg border border-blue-200 font-medium">
              Target Capacity: {customer.concurrent_users || customer.total_users} users (+25% buffer)
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={cn(
              'p-4 rounded-xl border transition-all',
              isNetworkConfigured
                ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                : 'bg-blue-50/80 border-blue-300 shadow-2xs'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                <Network className={cn('h-4 w-4', isNetworkConfigured ? 'text-emerald-600' : 'text-blue-600')} />
                Step 1: Interface & DHCP Setup
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10.5px] font-semibold border',
                  isNetworkConfigured
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                )}
              >
                {isNetworkConfigured ? '✓ Configured' : 'Pending Step 1'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Deploys QinQ sub-interface (<code className="text-[11px] font-mono text-slate-700">{customer.qinq_interface || 'eth0'}.{customer.svlan || '—'}.{customer.cvlan || '—'}</code>), DHCP pool & DNS forwarder.
            </p>
          </div>

          <div
            className={cn(
              'p-4 rounded-xl border transition-all',
              customer.status === 'PUSHED' || customer.status === 'ACTIVE'
                ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                : isNetworkConfigured
                  ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 opacity-80'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                <ShieldCheck
                  className={cn(
                    'h-4 w-4',
                    customer.status === 'PUSHED' || customer.status === 'ACTIVE'
                      ? 'text-emerald-600'
                      : isNetworkConfigured
                        ? 'text-amber-600'
                        : 'text-slate-400'
                  )}
                />
                Step 2: Router Activation & QoS
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10.5px] font-semibold border',
                  customer.status === 'PUSHED' || customer.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isNetworkConfigured
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                )}
              >
                {customer.status === 'PUSHED' || customer.status === 'ACTIVE'
                  ? '✓ Active & Live'
                  : isNetworkConfigured
                    ? 'Ready for Step 2'
                    : 'Awaiting Step 1'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Deploys NFTables captive firewall chains and TC traffic control bandwidth queues on WAN interface.
            </p>
          </div>
        </div>

        {/* Router Topology & Allocation Matrix Card */}
        <RouterTopologyCard
          topology={routerTopology}
          isLoading={loadingTopology}
          selectedCvlan={watchedCvlan}
          currentCustomerId={customerId}
          onSelectCvlan={(cvlan) => setValue('cvlan', cvlan)}
        />

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Network & IP Configuration Guardrails
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                className="gap-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                isLoading={isCarvingSubnet}
                onClick={handleAutoCarveSubnet}
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Auto-Calculate & Carve Subnet
              </Button>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="VyOS Router Instance *"
                  error={errors.captive_instance_id?.message}
                  {...register('captive_instance_id')}
                  options={(instances || []).map((inst: InstanceRead) => ({
                    value: inst.instance_id || inst.id,
                    label: (inst.name || ('Instance #' + (inst.instance_id || inst.id))) + ' (' + (inst.network?.vyos_ip || inst.host || '—') + ')',
                  }))}
                />

                <Select
                  label="QoS Mode *"
                  error={errors.qos_mode?.message}
                  {...register('qos_mode')}
                  options={[
                    { value: 'per_user', label: 'Per User Rate Limiting' },
                    { value: 'hierarchical', label: 'Hierarchical Shaping' },
                  ]}
                />

                <Select
                  label="QinQ Base Interface *"
                  error={errors.qinq_interface?.message}
                  {...register('qinq_interface')}
                  options={[
                    { value: 'eth0', label: 'eth0 (Default Primary Trunk)' },
                    { value: 'eth1', label: 'eth1 (Secondary Interface)' },
                    { value: 'eth2', label: 'eth2 (Core / Backhaul)' },
                  ]}
                />

                <Input
                  label="WAN Interface (TC QoS) *"
                  placeholder="eth0"
                  error={errors.wan_interface?.message}
                  {...register('wan_interface')}
                />

                <Input
                  label="Service VLAN (SVLAN) *"
                  type="number"
                  placeholder="100"
                  error={errors.svlan?.message}
                  {...register('svlan')}
                />

                <div>
                  <Input
                    label="Customer VLAN (CVLAN) *"
                    type="number"
                    placeholder="1001"
                    error={errors.cvlan?.message}
                    {...register('cvlan')}
                  />
                  {routerTopology && (
                    <div className="flex justify-between items-center text-[10.5px] text-slate-400 mt-1 font-mono">
                      <span>Allowed range: {routerTopology.cvlan_start}–{routerTopology.cvlan_end}</span>
                      {routerTopology.next_available_cvlan && (
                        <button
                          type="button"
                          onClick={() => setValue('cvlan', routerTopology.next_available_cvlan!)}
                          className="text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          Next free: {routerTopology.next_available_cvlan}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <Input
                  label="Allocated Subnet CIDR *"
                  placeholder="10.2.1.0/24"
                  error={errors.subnet_cidr?.message}
                  {...register('subnet_cidr')}
                />

                <Input
                  label="Default Gateway IP *"
                  placeholder="10.2.1.1"
                  error={errors.gateway_ip?.message}
                  {...register('gateway_ip')}
                />

                <Input
                  label="DHCP Start IP *"
                  placeholder="10.2.1.5"
                  error={errors.dhcp_range_start?.message}
                  {...register('dhcp_range_start')}
                />

                <Input
                  label="DHCP End IP *"
                  placeholder="10.2.1.254"
                  error={errors.dhcp_range_end?.message}
                  {...register('dhcp_range_end')}
                />

                <Input
                  label="DHCP Lease Time (seconds) *"
                  type="number"
                  placeholder="900"
                  error={errors.dhcp_lease_time?.message}
                  {...register('dhcp_lease_time')}
                />

                <Select
                  label="Max Bandwidth Limit *"
                  error={errors.max_bandwidth?.message}
                  {...register('max_bandwidth')}
                  options={[
                    { value: '1gbit', label: '1 Gbps (1gbit)' },
                    { value: '500mbit', label: '500 Mbps (500mbit)' },
                    { value: '100mbit', label: '100 Mbps (100mbit)' },
                    { value: '50mbit', label: '50 Mbps (50mbit)' },
                    { value: '10mbit', label: '10 Mbps (10mbit)' },
                  ]}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-900 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    {...register('dns_forward_enabled')}
                  />
                  <span>Enable DNS Forwarding (Allows captive portal clients to resolve DNS queries via gateway)</span>
                </label>
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/noc')}
            >
              Cancel
            </Button>
            
            <div className="flex flex-wrap items-center gap-2.5 justify-end">
              {/* Step 1 Button */}
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="gap-1.5 border-blue-300 text-blue-700 bg-blue-50/60 hover:bg-blue-100/80 font-medium text-xs shadow-2xs"
                isLoading={provisionNetworkMutation.isPending}
                disabled={isProvisioning}
                onClick={handleSubmit(handleDeployStep1Only)}
              >
                <Network className="h-4 w-4 text-blue-600" />
                {isNetworkConfigured
                  ? 'Re-Deploy Step 1 (Interface + DHCP)'
                  : 'Deploy Step 1 (Interface + DHCP Only)'}
              </Button>

              {/* Step 2 Button */}
              <Button
                type="button"
                variant="secondary"
                size="md"
                className={cn(
                  'gap-1.5 font-medium text-xs shadow-2xs transition-all',
                  isNetworkConfigured
                    ? 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                    : 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed'
                )}
                disabled={!isNetworkConfigured || isProvisioning}
                isLoading={onboardMutation.isPending}
                onClick={() => onboardMutation.mutate()}
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {customer.status === 'PUSHED' || customer.status === 'ACTIVE'
                  ? 'Re-Activate Step 2 (NFTables + TC)'
                  : 'Activate Step 2 (NFTables + TC Shaping)'}
              </Button>

              {/* 1-Click Full Automation Button */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                isLoading={isProvisioning}
              >
                <Play className="h-4 w-4" />
                1-Click Full Provision (Step 1 + Step 2)
              </Button>
            </div>
          </div>
        </form>

        {/* Confirmation Modal */}
        <ConfirmDialog
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={executeFullOnboarding}
          title={'Confirm Full Network Provisioning: ' + customer.company_name}
          description={
            'This 1-click operation will execute the complete 2-step router provisioning pipeline:\n\n' +
            '• Step 1: Configures VyOS QinQ sub-interface (' + (pendingFormData?.qinq_interface || 'eth0') + '.' + (pendingFormData?.svlan || 100) + '.' + (pendingFormData?.cvlan || 1001) + '), DHCP pool (' + (pendingFormData?.subnet_cidr || '') + '), and DNS forwarding.\n' +
            '• Step 2: Initializes NFTables firewall chains, captive portal redirection rules, and TC QoS bandwidth rate queues (' + (pendingFormData?.max_bandwidth || '100mbit') + ' on ' + (pendingFormData?.wan_interface || 'eth0') + ').\n\n' +
            'Proceed with full deployment?'
          }
          confirmText="Deploy All Steps on VyOS"
          variant="primary"
          isLoading={isProvisioning}
        />
      </div>
    </div>
  )
}

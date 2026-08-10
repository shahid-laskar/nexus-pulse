import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { customersApi } from '@/api/master-data'
import { nocApi } from '@/api/noc'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { InstanceRead } from '@/types'

const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.){3}(25[0-5]|(2[0-4]|1\d|[1-9]|)\d)$/

const schema = z.object({
  captive_instance_id: z.coerce.number().min(1, 'Select a router instance'),
  qinq_interface:      z.string().min(2, 'QinQ interface required'),
  wan_interface:       z.string().min(2, 'WAN interface required'),
  svlan:               z.coerce.number().min(1, 'Min S-VLAN is 1').max(4094, 'Max S-VLAN is 4094'),
  cvlan:               z.string().optional().or(z.literal('')),
  start_ip:            z.string().regex(ipv4Regex, 'Valid IPv4 required'),
  end_ip:              z.string().regex(ipv4Regex, 'Valid IPv4 required'),
  qos_mode:            z.string().default('per_user'),
  max_bandwidth:       z.string().default('1gbit'),
})

type NetForm = z.infer<typeof schema>

export function OnboardPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const { id }       = useParams<{ id: string }>()
  const customerId   = Number(id)
  const navigate     = useNavigate()
  const qc           = useQueryClient()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingFormData, setPendingFormData]   = useState<NetForm | null>(null)

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customers', customerId],
    queryFn:  () => customersApi.get(customerId),
    enabled:  Boolean(customerId),
  })

  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: ['noc-instances'],
    queryFn:  () => nocApi.listInstances(),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<NetForm>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      qos_mode:      customer?.qos_mode || 'per_user',
      max_bandwidth: customer?.max_bandwidth || '1gbit',
      qinq_interface: customer?.qinq_interface || 'eth0',
      wan_interface:  customer?.wan_interface || 'eth1',
    },
    values: customer ? {
      captive_instance_id: customer.captive_instance_id ?? 1,
      qinq_interface:      customer.qinq_interface || 'eth0',
      wan_interface:       customer.wan_interface  || 'eth1',
      svlan:               customer.svlan ?? 100,
      cvlan:               customer.cvlan ? String(customer.cvlan) : '',
      start_ip:            customer.start_ip || '',
      end_ip:              customer.end_ip || '',
      qos_mode:            customer.qos_mode || 'per_user',
      max_bandwidth:       customer.max_bandwidth || '1gbit',
    } : undefined,
  })

  const saveNetwork = useMutation({
    mutationFn: (data: NetForm) => customersApi.updateNetwork(customerId, {
      captive_instance_id: data.captive_instance_id,
      qinq_interface:      data.qinq_interface,
      wan_interface:       data.wan_interface,
      svlan:               data.svlan,
      cvlan:               data.cvlan ? Number(data.cvlan) : undefined,
      start_ip:            data.start_ip,
      end_ip:              data.end_ip,
      qos_mode:            data.qos_mode,
      max_bandwidth:       data.max_bandwidth,
    }),
  })

  const onboard = useMutation({
    mutationFn: () => nocApi.onboard(customerId),
    onSuccess: (res) => {
      toast.success(`✅ ${res.company_name} provisioned on router! Slug: ${res.slug}`)
      qc.invalidateQueries({ queryKey: ['customers'] })
      setShowConfirmModal(false)
      navigate('/noc')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to provision customer on router'))
      setShowConfirmModal(false)
    },
  })

  const onSubmitForm = (data: NetForm) => {
    setPendingFormData(data)
    setShowConfirmModal(true)
  }

  const executeProvision = async () => {
    if (!pendingFormData) return
    try {
      await saveNetwork.mutateAsync(pendingFormData)
      await onboard.mutateAsync()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save network configuration'))
    }
  }

  if (loadingCustomer || loadingInstances) return <PageLoader />
  if (!customer) return <div className="p-8 text-slate-500">Customer not found</div>

  const isProvisioning = saveNetwork.isPending || onboard.isPending

  return (
    <div>
      <PageHeader title={`Provision: ${customer.company_name}`} subtitle="Configure router network fields and provision nftables + TC rules." />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          <strong>Customer Info:</strong> {customer.company_name} · GSTIN: {customer.gstin} · Total Users: {customer.total_users}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          ⚠️ <strong>Provisioning Action:</strong> This initializes customer nftables sets, firewall rules, and HTB Qdisc traffic shaping on the VyOS router.
        </div>

        <form onSubmit={handleSubmit(onSubmitForm)}>
          <Card>
            <CardHeader><h3 className="font-semibold text-foreground">Network & Router Configuration</h3></CardHeader>
            <CardBody className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Router Instance *"
                  error={errors.captive_instance_id?.message}
                  {...register('captive_instance_id')}
                  options={(instances || []).map((inst: InstanceRead) => ({
                    value: inst.id,
                    label: `${inst.name || 'Instance #' + inst.id} (${inst.host})`,
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

                <Input
                  label="QinQ Interface *"
                  placeholder="eth0"
                  error={errors.qinq_interface?.message}
                  {...register('qinq_interface')}
                />

                <Input
                  label="WAN Interface *"
                  placeholder="eth1"
                  error={errors.wan_interface?.message}
                  {...register('wan_interface')}
                />

                <Input
                  label="S-VLAN *"
                  type="number"
                  placeholder="100"
                  error={errors.svlan?.message}
                  {...register('svlan')}
                />

                <Input
                  label="C-VLAN"
                  type="number"
                  placeholder="Optional"
                  error={errors.cvlan?.message}
                  {...register('cvlan')}
                />

                <Input
                  label="Start IP *"
                  placeholder="192.168.1.1"
                  error={errors.start_ip?.message}
                  {...register('start_ip')}
                />

                <Input
                  label="End IP *"
                  placeholder="192.168.1.254"
                  error={errors.end_ip?.message}
                  {...register('end_ip')}
                />

                <Select
                  label="Max Bandwidth (TC) *"
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

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="submit" variant="danger" isLoading={isProvisioning}>
                  🚀 Provision to Router
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/noc')}>
                  Cancel
                </Button>
              </div>
            </CardBody>
          </Card>
        </form>

        {/* Provision Confirmation Modal */}
        <ConfirmDialog
          isOpen={showConfirmModal}
          title={`Provision ${customer.company_name} to VyOS?`}
          description={
            <div className="space-y-2">
              <p>Are you sure you want to push this network configuration to the router?</p>
              <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1 font-mono">
                <li>Instance: #{pendingFormData?.captive_instance_id}</li>
                <li>Interfaces: QinQ={pendingFormData?.qinq_interface}, WAN={pendingFormData?.wan_interface}</li>
                <li>VLANs: S-VLAN={pendingFormData?.svlan} {pendingFormData?.cvlan ? `, C-VLAN=${pendingFormData.cvlan}` : ''}</li>
                <li>IP Pool: {pendingFormData?.start_ip} – {pendingFormData?.end_ip}</li>
                <li>Max Bandwidth: {pendingFormData?.max_bandwidth}</li>
              </ul>
            </div>
          }
          confirmText="Yes, Provision Now"
          variant="danger"
          isLoading={isProvisioning}
          onConfirm={executeProvision}
          onClose={() => setShowConfirmModal(false)}
        />
      </div>
    </div>
  )
}

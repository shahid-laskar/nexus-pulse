import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { customersApi } from '@/api/master-data'
import { nocApi } from '@/api/noc'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useApiError } from '@/hooks/useApiError'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'

interface NetForm {
  captive_instance_id: string
  qinq_interface:      string
  wan_interface:       string
  svlan:               string
  cvlan:               string
  start_ip:            string
  end_ip:              string
  qos_mode:            string
}

export function OnboardPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { getError } = useApiError()
  const qc           = useQueryClient()

  const { data: c, isLoading } = useQuery({
    queryKey: ['customers', id],
    queryFn:  () => customersApi.get(Number(id)),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<NetForm>({
    defaultValues: { qos_mode: 'per_user' },
  })

  const saveNetwork = useMutation({
    mutationFn: (data: NetForm) => customersApi.updateNetwork(Number(id), {
      captive_instance_id: Number(data.captive_instance_id),
      qinq_interface:      data.qinq_interface,
      wan_interface:       data.wan_interface,
      svlan:               Number(data.svlan),
      cvlan:               data.cvlan ? Number(data.cvlan) : undefined,
      start_ip:            data.start_ip,
      end_ip:              data.end_ip,
      qos_mode:            data.qos_mode,
    }),
  })

  const onboard = useMutation({
    mutationFn: () => nocApi.onboard(Number(id)),
    onSuccess: (res) => {
      toast.success(`✅ ${res.company_name} provisioned! Slug: ${res.slug}`)
      qc.invalidateQueries({ queryKey: ['customers'] })
      navigate('/noc')
    },
    onError: (err) => toast.error(getError(err)),
  })

  const onSubmit = async (data: NetForm) => {
    if (!data.captive_instance_id || !data.qinq_interface || !data.start_ip || !data.end_ip) {
      toast.error('Please fill all required fields')
      return
    }
    if (!confirm(`Provision ${c?.company_name} on router? This pushes nftables + TC rules.`)) return
    try {
      await saveNetwork.mutateAsync(data)
      await onboard.mutateAsync()
    } catch (err) {
      toast.error(getError(err))
    }
  }

  if (isLoading) return <PageLoader />
  if (!c) return <div className="p-8 text-[#6b7ea8]">Customer not found</div>

  const busy = saveNetwork.isPending || onboard.isPending

  return (
    <div>
      <PageHeader title={`Provision: ${c.company_name}`} subtitle="Fill network config then push to VyOS" />
      <div className="p-8 max-w-2xl">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm">
          <strong className="text-blue-800">Staging data:</strong>
          <span className="text-blue-700 ml-2">{c.company_name} · {c.gstin} · {c.total_users} users · {c.registration_approval_mode} approval</span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
          ⚠️ <strong>This provisions nftables and TC rules on the live VyOS router.</strong> Verify IPs and VLANs carefully.
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader><h3 className="font-semibold text-[#1a2340]">Network Configuration</h3></CardHeader>
            <CardBody className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="VyOS Instance ID *" type="number" {...register('captive_instance_id', { required: true })} />
                <Select label="QoS Mode *" options={[{ value: 'per_user', label: 'Per User' }, { value: 'hierarchical', label: 'Hierarchical' }]} {...register('qos_mode')} />
                <Input label="QinQ Interface *" placeholder="eth0" {...register('qinq_interface', { required: true })} />
                <Input label="WAN Interface *"  placeholder="eth1" {...register('wan_interface',  { required: true })} />
                <Input label="S-VLAN *"  type="number" {...register('svlan', { required: true })} />
                <Input label="C-VLAN"    type="number" hint="Optional" {...register('cvlan')} />
                <Input label="Start IP *" placeholder="192.168.1.1"   {...register('start_ip', { required: true })} />
                <Input label="End IP *"   placeholder="192.168.1.254" {...register('end_ip',   { required: true })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={busy} variant="danger">🚀 Provision to Router</Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/noc')}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        </form>
      </div>
    </div>
  )
}

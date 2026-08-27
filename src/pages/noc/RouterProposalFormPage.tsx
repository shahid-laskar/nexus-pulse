import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Server,
  Network,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldAlert,
  Lock,
  Building,
  Globe,
} from 'lucide-react'
import { nocApi } from '@/api/noc'
import { circlesApi, businessAreasApi } from '@/api/master-data'
import { adminApi } from '@/api/admin'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/store/auth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import type { RouterProposalCreate, BASvlanAllocation } from '@/types'

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/

const schema = z
  .object({
    // Step 1: Basic info
    name: z.string().min(1, 'Name is required').max(200),
    identifier: z
      .string()
      .min(2, 'At least 2 characters')
      .max(100)
      .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
    proposed_instance_id: z.coerce.number().min(1, 'Instance ID must be at least 1').optional(),
    circle_id: z.coerce.number().min(1, 'Please select a Circle').optional(),
    ba_id: z.coerce.number().min(1, 'Please select a Business Area').optional(),
    notes: z.string().optional(),

    // Step 2: Network
    vyos_ip: z.string().regex(IPV4_REGEX, 'Must be a valid IPv4 address'),
    vyos_management_ip: z.string().regex(IPV4_REGEX, 'Must be a valid IPv4 address'),
    nas_identifier: z.string().min(1, 'NAS Identifier is required').max(100),
    wan_interface: z.string().min(1).default('eth0'),
    wan_max_bandwidth: z.string().min(1).default('1gbit'),
    svlan_allocation_id: z.coerce.number().optional().nullable(),
    cvlan_start: z.coerce.number().min(1).max(4094).optional().nullable(),
    cvlan_end: z.coerce.number().min(1).max(4094).optional().nullable(),

    // Step 3: Credentials
    api_endpoint: z.string().optional().nullable(),
    api_key: z.string().optional().nullable(),
    ssh_username: z.string().min(1).default('vyos'),
    ssh_password: z.string().optional().nullable(),
    ssh_port: z.coerce.number().min(1).max(65535).default(22),
  })
  .superRefine((data, ctx) => {
    if (data.cvlan_start && data.cvlan_end && data.cvlan_start > data.cvlan_end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'cvlan_start must be less than or equal to cvlan_end',
        path: ['cvlan_start'],
      })
    }
  })

interface FormValues {
  name: string
  identifier: string
  proposed_instance_id?: number
  circle_id?: number
  ba_id?: number
  notes?: string
  vyos_ip: string
  vyos_management_ip: string
  nas_identifier: string
  wan_interface: string
  wan_max_bandwidth: string
  svlan_allocation_id?: number | null
  cvlan_start?: number | null
  cvlan_end?: number | null
  api_endpoint?: string | null
  api_key?: string | null
  ssh_username: string
  ssh_password?: string | null
  ssh_port: number
}

export function RouterProposalFormPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, isSuper, isNOC, scopeCircle, scopeBA } = useAuthStore()

  const [step, setStep] = useState<number>(1)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      wan_interface: 'eth0',
      wan_max_bandwidth: '1gbit',
      ssh_username: 'vyos',
      ssh_port: 22,
      notes: '',
    },
    mode: 'onBlur',
  })

  const selectedCircleId = useWatch({ control, name: 'circle_id' })
  const selectedBaId = useWatch({ control, name: 'ba_id' })

  // 1. Fetch Circles
  const { data: circles = [] } = useQuery({
    queryKey: ['circles'],
    queryFn: () => circlesApi.list(),
  })

  // 2. Fetch Business Areas
  const { data: businessAreas = [] } = useQuery({
    queryKey: ['business-areas'],
    queryFn: () => businessAreasApi.list(),
  })

  const activeCircleId = isNOC
    ? (scopeCircle?.id || user?.profile.circle?.id)
    : selectedCircleId

  const activeBaId = isNOC
    ? (scopeBA?.id || user?.profile.business_area?.id)
    : selectedBaId

  const filteredBAs = businessAreas.filter(
    (ba) => !activeCircleId || ba.circle_id === Number(activeCircleId)
  )

  // 3. Fetch SVLAN allocations for selected BA
  const { data: svlanAllocations = [] } = useQuery({
    queryKey: ['ba-svlan-allocations', activeBaId],
    queryFn: () => adminApi.listBASvlanAllocations(Number(activeBaId)),
    enabled: Boolean(activeBaId),
  })

  // 4. Fetch Next Available Instance ID (for create mode)
  const { data: nextInstanceData } = useQuery({
    queryKey: ['noc-next-instance-id'],
    queryFn: () => nocApi.getNextProposalInstanceId(),
    enabled: !isEdit,
    staleTime: 5_000,
  })

  // 5. Fetch Proposal if in Edit Mode
  const { data: proposal, isLoading: isLoadingProposal } = useQuery({
    queryKey: ['noc-router-proposal', id],
    queryFn: () => nocApi.getRouterProposal(Number(id)),
    enabled: isEdit,
  })

  // Auto-fill circle, BA and next instance ID
  useEffect(() => {
    if (!isEdit) {
      if (nextInstanceData?.next_instance_id) {
        setValue('proposed_instance_id', nextInstanceData.next_instance_id)
      }
      if (isNOC) {
        const cId = scopeCircle?.id || user?.profile.circle?.id
        const bId = scopeBA?.id || user?.profile.business_area?.id
        if (cId) setValue('circle_id', cId)
        if (bId) setValue('ba_id', bId)
      }
    }
  }, [isEdit, nextInstanceData, isNOC, scopeCircle, scopeBA, user, setValue])

  useEffect(() => {
    if (proposal) {
      setValue('name', proposal.name)
      setValue('identifier', proposal.identifier)
      setValue('proposed_instance_id', proposal.proposed_instance_id)
      setValue('circle_id', proposal.circle_id)
      setValue('ba_id', proposal.ba_id)
      setValue('notes', proposal.notes || '')
      setValue('vyos_ip', proposal.vyos_ip)
      setValue('vyos_management_ip', proposal.vyos_management_ip)
      setValue('nas_identifier', proposal.nas_identifier)
      setValue('wan_interface', proposal.wan_interface || 'eth0')
      setValue('wan_max_bandwidth', proposal.wan_max_bandwidth || '1gbit')
      setValue('svlan_allocation_id', proposal.svlan_allocation_id ?? null)
      setValue('cvlan_start', proposal.cvlan_start ?? null)
      setValue('cvlan_end', proposal.cvlan_end ?? null)
      setValue('api_endpoint', proposal.api_endpoint === '***' ? '' : proposal.api_endpoint || '')
      setValue('ssh_username', proposal.ssh_username || 'vyos')
      setValue('ssh_port', proposal.ssh_port || 22)
    }
  }, [proposal, setValue])

  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const resolvedCircleId = isNOC
        ? (scopeCircle?.id || user?.profile.circle?.id || Number(data.circle_id))
        : Number(data.circle_id)

      const resolvedBaId = isNOC
        ? (scopeBA?.id || user?.profile.business_area?.id || Number(data.ba_id))
        : Number(data.ba_id)

      const resolvedInstanceId =
        !isSuper && !isEdit && nextInstanceData?.next_instance_id
          ? nextInstanceData.next_instance_id
          : Number(data.proposed_instance_id)

      const payload: RouterProposalCreate = {
        name: data.name,
        identifier: data.identifier,
        proposed_instance_id: resolvedInstanceId,
        circle_id: resolvedCircleId,
        ba_id: resolvedBaId,
        vyos_ip: data.vyos_ip,
        vyos_management_ip: data.vyos_management_ip,
        nas_identifier: data.nas_identifier,
        wan_interface: data.wan_interface || 'eth0',
        wan_max_bandwidth: data.wan_max_bandwidth || '1gbit',
        svlan_allocation_id: data.svlan_allocation_id ? Number(data.svlan_allocation_id) : null,
        cvlan_start: data.cvlan_start ? Number(data.cvlan_start) : null,
        cvlan_end: data.cvlan_end ? Number(data.cvlan_end) : null,
        api_endpoint: data.api_endpoint?.trim() || null,
        api_key: data.api_key?.trim() || null,
        ssh_username: data.ssh_username || 'vyos',
        ssh_password: data.ssh_password?.trim() || null,
        ssh_port: Number(data.ssh_port || 22),
        notes: data.notes || '',
      }

      if (isEdit && id) {
        return nocApi.updateRouterProposal(Number(id), payload)
      }
      return nocApi.createRouterProposal(payload)
    },
    onSuccess: (saved) => {
      toast.success(
        isEdit
          ? `Proposal "${saved.name}" updated successfully`
          : `Proposal draft "${saved.name}" created successfully`
      )
      qc.invalidateQueries({ queryKey: ['noc-router-proposals'] })
      navigate('/noc/router-proposals')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || 'Failed to save router proposal')
    },
  })

  const validateStep = async (stepNumber: number): Promise<boolean> => {
    if (stepNumber === 1) {
      return trigger(['name', 'identifier', 'proposed_instance_id', 'circle_id', 'ba_id', 'notes'])
    }
    if (stepNumber === 2) {
      return trigger([
        'vyos_ip',
        'vyos_management_ip',
        'nas_identifier',
        'wan_interface',
        'wan_max_bandwidth',
        'svlan_allocation_id',
        'cvlan_start',
        'cvlan_end',
      ])
    }
    return true
  }

  const handleNext = async () => {
    const isValid = await validateStep(step)
    if (isValid) {
      setStep((prev) => Math.min(prev + 1, 3))
    }
  }

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values)
  }

  if (isEdit && isLoadingProposal) {
    return <PageLoader />
  }

  const circleDisplayName =
    scopeCircle?.name || user?.profile.circle?.name || 'Assigned Circle'
  const baDisplayName =
    scopeBA?.name || user?.profile.business_area?.name || 'Assigned Business Area'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? `Edit Proposal: ${proposal?.name || ''}` : 'New Router Proposal'}
        subtitle={
          isEdit
            ? 'Update proposal configuration draft or revision'
            : 'Draft a new edge router provisioning proposal for Super Admin review'
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/noc/router-proposals')}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Proposals
          </Button>
        }
      />

      {/* Stepper Navigation */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-surface-2/60 rounded-xl border border-hairline">
        {[
          { num: 1, label: '1. Basic Info', icon: Server },
          { num: 2, label: '2. Network', icon: Network },
          { num: 3, label: '3. Credentials', icon: KeyRound },
        ].map((s) => {
          const Icon = s.icon
          const isActive = step === s.num
          const isDone = step > s.num
          return (
            <button
              key={s.num}
              type="button"
              onClick={async () => {
                if (s.num < step) setStep(s.num)
                else if (await validateStep(step)) setStep(s.num)
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : isDone
                  ? 'bg-surface text-foreground hover:bg-surface-2'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{s.label}</span>
              {isDone && <Check className="h-3 w-3 text-healthy" />}
            </button>
          )
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardBody className="p-6 space-y-6">
            {/* ── STEP 1: Basic Info ── */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-hairline pb-3 mb-4">
                  <h3 className="text-sm font-bold text-foreground">Step 1 — Basic Information</h3>
                  <p className="text-xs text-muted-foreground">
                    Name, unique identifier slug, and regional assignment.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Router Name *"
                    placeholder="e.g. Trivandrum Main Edge GW 01"
                    error={errors.name?.message}
                    {...register('name')}
                  />

                  <Input
                    label="Identifier Slug *"
                    placeholder="e.g. tvm-edge-01"
                    disabled={isEdit}
                    hint={isEdit ? 'Identifier slug cannot be changed after creation' : undefined}
                    error={errors.identifier?.message}
                    {...register('identifier')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Input
                      label="Proposed Instance ID *"
                      type="number"
                      placeholder="e.g. 10"
                      disabled={isNOC}
                      hint={
                        isNOC
                          ? 'Auto-fixed to next available ID. Superadmin can edit if required.'
                          : 'Superadmin can edit instance ID as required.'
                      }
                      error={errors.proposed_instance_id?.message}
                      {...register('proposed_instance_id')}
                    />
                  </div>

                  {isNOC ? (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground block mb-1">
                        Circle
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-2 rounded-lg border border-hairline text-xs font-medium text-foreground">
                        <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{circleDisplayName}</span>
                        <Lock className="h-3 w-3 text-muted-foreground ml-auto" />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Fixed to your NOC credentials
                      </p>
                    </div>
                  ) : (
                    <Select
                      label="Circle *"
                      placeholder="Select Circle"
                      options={circles.map((c) => ({
                        value: c.id,
                        label: `${c.name} (${c.code})`,
                      }))}
                      error={errors.circle_id?.message}
                      {...register('circle_id')}
                    />
                  )}

                  {isNOC ? (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground block mb-1">
                        Business Area
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-2 rounded-lg border border-hairline text-xs font-medium text-foreground">
                        <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{baDisplayName}</span>
                        <Lock className="h-3 w-3 text-muted-foreground ml-auto" />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Fixed to your NOC credentials
                      </p>
                    </div>
                  ) : (
                    <Select
                      label="Business Area *"
                      placeholder="Select Business Area"
                      options={filteredBAs.map((ba) => ({
                        value: ba.id,
                        label: `${ba.name} (${ba.code})`,
                      }))}
                      error={errors.ba_id?.message}
                      {...register('ba_id')}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Proposal Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide context, deployment purpose, or notes for the Super Admin reviewer..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-surface text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                    {...register('notes')}
                  />
                </div>
              </div>
            )}

            {/* ── STEP 2: Network Specifications ── */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-hairline pb-3 mb-4">
                  <h3 className="text-sm font-bold text-foreground">
                    Step 2 — Network Specifications
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    IP endpoints, interfaces, and SVLAN/CVLAN allocations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="VyOS Router IP *"
                    placeholder="e.g. 10.44.1.1"
                    error={errors.vyos_ip?.message}
                    {...register('vyos_ip')}
                  />

                  <Input
                    label="VyOS Management IP *"
                    placeholder="e.g. 10.44.1.254"
                    error={errors.vyos_management_ip?.message}
                    {...register('vyos_management_ip')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="NAS Identifier *"
                    placeholder="e.g. TVM-NAS-01"
                    error={errors.nas_identifier?.message}
                    {...register('nas_identifier')}
                  />

                  <Input
                    label="WAN Interface *"
                    placeholder="eth0"
                    error={errors.wan_interface?.message}
                    {...register('wan_interface')}
                  />

                  <Input
                    label="Max Bandwidth *"
                    placeholder="1gbit"
                    error={errors.wan_max_bandwidth?.message}
                    {...register('wan_max_bandwidth')}
                  />
                </div>

                <div className="p-4 bg-surface-2/40 rounded-xl border border-hairline space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    VLAN Allocation & Range
                  </h4>

                  <Select
                    label="SVLAN Allocation (Optional)"
                    placeholder="Select SVLAN Allocation (or leave unselected)"
                    options={svlanAllocations.map((a: BASvlanAllocation) => ({
                      value: a.id,
                      label: `SVLAN ${a.svlan} (CVLAN range: ${a.cvlan_range_start}–${a.cvlan_range_end})`,
                    }))}
                    error={errors.svlan_allocation_id?.message}
                    {...register('svlan_allocation_id')}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="CVLAN Start"
                      type="number"
                      placeholder="e.g. 10"
                      error={errors.cvlan_start?.message}
                      {...register('cvlan_start')}
                    />

                    <Input
                      label="CVLAN End"
                      type="number"
                      placeholder="e.g. 4090"
                      error={errors.cvlan_end?.message}
                      {...register('cvlan_end')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Credentials & Access ── */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-hairline pb-3 mb-4">
                  <h3 className="text-sm font-bold text-foreground">
                    Step 3 — Credentials & Access (Optional)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    API endpoint and SSH management credentials.
                  </p>
                </div>

                {/* Encryption Notice */}
                <div className="p-3 bg-healthy/10 border border-healthy/20 rounded-lg flex items-center gap-2.5 text-xs text-healthy font-medium">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>
                    All credentials are encrypted with HKDF-SHA256 & Fernet before storage in the
                    database and are never exposed in plaintext.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="VyOS API Endpoint"
                    placeholder="https://10.44.1.1:8443"
                    error={errors.api_endpoint?.message}
                    {...register('api_endpoint')}
                  />

                  <Input
                    label="VyOS API Key"
                    type="password"
                    placeholder={
                      isEdit && proposal?.has_api_key
                        ? '[Configured — leave blank to keep unchanged]'
                        : 'API Key secret'
                    }
                    error={errors.api_key?.message}
                    {...register('api_key')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="SSH Username"
                    placeholder="vyos"
                    error={errors.ssh_username?.message}
                    {...register('ssh_username')}
                  />

                  <Input
                    label="SSH Password"
                    type="password"
                    placeholder={
                      isEdit && proposal?.has_ssh_password
                        ? '[Configured — leave blank to keep unchanged]'
                        : 'SSH Password'
                    }
                    error={errors.ssh_password?.message}
                    {...register('ssh_password')}
                  />

                  <Input
                    label="SSH Port"
                    type="number"
                    placeholder="22"
                    error={errors.ssh_port?.message}
                    {...register('ssh_port')}
                  />
                </div>
              </div>
            )}

            {/* Stepper Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-hairline">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setStep((prev) => prev - 1)}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/noc/router-proposals')}
                >
                  Cancel
                </Button>

                {step < 3 ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleNext}
                    className="gap-1.5"
                  >
                    Next Step
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting || saveMutation.isPending}
                    className="gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    {saveMutation.isPending
                      ? 'Saving Proposal...'
                      : isEdit
                      ? 'Save Changes'
                      : 'Create Proposal Draft'}
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  )
}

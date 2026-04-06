import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ebApi } from '@/api/eb'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useApiError } from '@/hooks/useApiError'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'

// Reusable: 10-digit Indian mobile, or empty string (for optional fields)
const indianMobile = z
  .string()
  .regex(/^\d{10}$/, 'Must be a 10-digit number')
  .or(z.literal(''))

const schema = z.object({
  // Identity
  company_name: z.string().min(2),
  // gstin → sent as `gst` by FastAPI; 15 chars, no blank allowed
  gstin: z.string().length(15, 'Must be exactly 15 chars'),
  // cin → blank=True, null=True on model — truly optional, empty string is fine
  cin: z.string().max(21).optional().or(z.literal('')),

  // Branding
  primary_color:   z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  // welcome_message → TextField blank=True, terms_url → URLField blank=True
  welcome_message: z.string().optional().or(z.literal('')),
  terms_url:       z.string().optional().or(z.literal('')),

  // Contact — all blank=True on model, but collected for captive portal
  contact_person: z.string().min(2),
  contact_email:  z.string().email(),
  contact_phone:  z.string().min(10).max(15),

  // Billing address — null=True, blank=True on model (migration defaults)
  billing_address_line1: z.string().min(5),
  billing_address_line2: z.string().optional().or(z.literal('')),
  billing_city:          z.string().min(2),
  billing_state:         z.string().min(2),
  billing_pincode:       z.string().regex(/^\d{6}$/, 'Must be 6 digits'),

  // Installation address
  same_as_billing:            z.boolean().optional(),
  installation_address_line1: z.string().optional().or(z.literal('')),
  installation_address_line2: z.string().optional().or(z.literal('')),
  installation_city:          z.string().optional().or(z.literal('')),
  installation_state:         z.string().optional().or(z.literal('')),
  installation_pincode:       z.string().regex(/^\d{6}$/, 'Must be 6 digits').optional().or(z.literal('')),

  // Auth / portal
  enable_password_login:    z.boolean().optional(),
  enable_otp_login:         z.boolean().optional(),
  enable_volume_control:    z.boolean().optional(),
  portal_entry_mode:        z.enum(['login', 'register_first']).optional(),
  device_approval_required: z.boolean().optional(),

  // Branch / Manager
  // branch_name  → required (no blank=True on model), defaults to company name
  // manager_phone  → max_length=10, validate_indian_mobile, blank=True
  // manager_mobile → max_length=10, validate_indian_mobile, blank=True
  // manager_email  → EmailField blank=True → optional
  // Branch.clean() enforces: at least one of manager_phone or manager_mobile
  branch_code: z.string().max(50).optional().or(z.literal('')),
  branch_name:    z.string().max(150).optional().or(z.literal('')),
  manager_name:   z.string().max(150).optional().or(z.literal('')),
  manager_phone:  indianMobile,
  manager_mobile: indianMobile,
  manager_email:  z.string().email('Invalid email').optional().or(z.literal('')),

  // Session / data limits
  total_users:             z.coerce.number().min(1),
  daily_data_limit_mb:     z.coerce.number().min(0),
  data_limit_mb:           z.coerce.number().min(0).optional(),
  time_limit_minutes:      z.coerce.number().min(0).optional(),
  session_timeout:         z.coerce.number().min(300).optional(),
  idle_timeout:            z.coerce.number().min(60).optional(),
  max_concurrent_sessions: z.coerce.number().min(1).max(10).optional(),
  throttle_bandwidth_up:   z.coerce.number().min(1).optional(),
  throttle_bandwidth_down: z.coerce.number().min(1).optional(),
  registration_approval_mode: z.enum(['manual', 'auto']),

}).superRefine((data, ctx) => {
  const needsBranch = data.portal_entry_mode === 'register_first'
    || data.device_approval_required

  if (needsBranch) {
    // Branch.clean(): at least one of manager_phone or manager_mobile required
    if (!data.manager_phone && !data.manager_mobile) {
      ctx.addIssue({
        path: ['manager_phone'], code: 'custom',
        message: 'At least one contact number (phone or mobile) is required',
      })
      ctx.addIssue({
        path: ['manager_mobile'], code: 'custom',
        message: 'At least one contact number (phone or mobile) is required',
      })
    }
    // manager_email required for OTP delivery
    if (!data.manager_email) {
      ctx.addIssue({
        path: ['manager_email'], code: 'custom',
        message: 'Required for this configuration',
      })
    }
  }

  // Installation address required when not same_as_billing
  if (!data.same_as_billing) {
    if (!data.installation_address_line1) ctx.addIssue({
      path: ['installation_address_line1'], code: 'custom',
      message: 'Required when installation differs from billing',
    })
    if (!data.installation_city) ctx.addIssue({
      path: ['installation_city'], code: 'custom',
      message: 'Required',
    })
    if (!data.installation_state) ctx.addIssue({
      path: ['installation_state'], code: 'custom',
      message: 'Required',
    })
    if (!data.installation_pincode) ctx.addIssue({
      path: ['installation_pincode'], code: 'custom',
      message: 'Required',
    })
  }
})

type FormData = z.infer<typeof schema>

export function EBCustomerFormPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])
  const navigate     = useNavigate()
  const { id }       = useParams<{ id?: string }>()
  const isEdit       = Boolean(id)
  const { getError } = useApiError()
  const qc           = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['eb-customers', id],
    queryFn:  () => ebApi.get(Number(id)),
    enabled:  isEdit,
  })

  const { register, handleSubmit, formState: { errors }, control, setValue, getValues } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        total_users:             100,
        daily_data_limit_mb:     0,
        data_limit_mb:           0,
        time_limit_minutes:      0,
        session_timeout:         86400,
        idle_timeout:            3600,
        max_concurrent_sessions: 2,
        throttle_bandwidth_up:   1024,
        throttle_bandwidth_down: 1024,
        registration_approval_mode: 'manual',
        primary_color:            '#004aad',
        secondary_color:          '#0066cc',
        enable_password_login:    true,
        enable_otp_login:         false,
        enable_volume_control:    true,
        portal_entry_mode:        'login',
        device_approval_required: false,
        same_as_billing:          true,
        // Branch defaults — branch_name falls back to company_name at submit time
        branch_code: '',
        branch_name:    '',
        manager_name:   '',
        manager_phone:  '',
        manager_mobile: '',
        manager_email:  '',
      },
      values: existing ? {
        company_name:   existing.company_name,
        gstin:          existing.gstin,
        cin:            existing.cin ?? '',
        contact_person: existing.contact_person,
        contact_email:  existing.contact_email,
        contact_phone:  existing.contact_phone,

        billing_address_line1: '',   // not returned by CustomerRead — leave blank on edit
        billing_address_line2: '',
        billing_city:          existing.billing_city,
        billing_state:         existing.billing_state,
        billing_pincode:       '',

        same_as_billing:            true,
        installation_address_line1: '',
        installation_address_line2: '',
        installation_city:          '',
        installation_state:         '',
        installation_pincode:       '',

        primary_color:   existing.primary_color,
        secondary_color: existing.secondary_color,
        welcome_message: existing.welcome_message ?? '',
        terms_url:       existing.terms_url ?? '',

        total_users:             existing.total_users,
        daily_data_limit_mb:     existing.daily_data_limit_mb,
        data_limit_mb:           existing.data_limit_mb ?? 0,
        time_limit_minutes:      existing.time_limit_minutes ?? 0,
        session_timeout:         existing.session_timeout ?? 86400,
        idle_timeout:            existing.idle_timeout ?? 3600,
        max_concurrent_sessions: existing.max_concurrent_sessions ?? 2,
        throttle_bandwidth_up:   existing.throttle_bandwidth_up,
        throttle_bandwidth_down: existing.throttle_bandwidth_down,
        registration_approval_mode: existing.registration_approval_mode as 'manual' | 'auto',

        enable_password_login:    existing.enable_password_login ?? true,
        enable_otp_login:         existing.enable_otp_login ?? false,
        enable_volume_control:    existing.enable_volume_control,
        portal_entry_mode:        existing.portal_entry_mode as 'login' | 'register_first',
        device_approval_required: existing.device_approval_required,

        // Branch — from nested branch object returned by serialize_customer
        branch_code: existing.branch?.branch_code ?? '',
        branch_name:    existing.branch?.branch_name   ?? '',
        manager_name:   existing.branch?.manager_name  ?? '',
        manager_phone:  existing.branch?.manager_phone  ?? '',
        manager_mobile: existing.branch?.manager_mobile ?? '',
        manager_email:  existing.branch?.manager_email  ?? '',
      } : undefined,
    })

  const sameAsBilling   = useWatch({ control, name: 'same_as_billing' })
  const portalEntryMode = useWatch({ control, name: 'portal_entry_mode' })
  const deviceApproval  = useWatch({ control, name: 'device_approval_required' })

  const needsBranch = portalEntryMode === 'register_first' || !!deviceApproval

  function handleSameAsBilling(checked: boolean) {
    setValue('same_as_billing', checked)
    if (checked) {
      setValue('installation_address_line1', getValues('billing_address_line1'))
      setValue('installation_address_line2', getValues('billing_address_line2') ?? '')
      setValue('installation_city',          getValues('billing_city'))
      setValue('installation_state',         getValues('billing_state'))
      setValue('installation_pincode',       getValues('billing_pincode'))
    } else {
      setValue('installation_address_line1', '')
      setValue('installation_address_line2', '')
      setValue('installation_city',          '')
      setValue('installation_state',         '')
      setValue('installation_pincode',       '')
    }
  }

  const save = useMutation({
    mutationFn: (data: FormData) => {
      // branch_name has no blank=True on model — fall back to company_name if left empty
      const payload = {
        ...data,
        branch_name: data.branch_name?.trim() || data.company_name,
      }
      return isEdit ? ebApi.update(Number(id), payload) : ebApi.create(payload)
    },
    onSuccess: (c) => {
      toast.success(isEdit ? 'Customer updated' : `'${c.company_name}' created as DRAFT`)
      qc.invalidateQueries({ queryKey: ['eb-customers'] })
      navigate('/eb')
    },
    onError: (err) => toast.error(getError(err)),
  })

  if (isEdit && isLoading) return <PageLoader />

  const Section = ({ title }: { title: string }) => (
    <div className="text-xs font-bold uppercase tracking-wider text-[#6b7ea8] pb-1 border-b border-[#f0f4fc] mt-2">
      {title}
    </div>
  )

  return (
    <div>
      <PageHeader
        title={isEdit ? `Edit — ${existing?.company_name}` : 'New EB Customer'}
        subtitle="Enterprise broadband customer"
      />
      <div className="p-8 max-w-3xl">
        <form onSubmit={handleSubmit(d => save.mutate(d))}>
          <Card>
            <CardBody className="flex flex-col gap-4">

              {/* ── Identity ─────────────────────────────────────────── */}
              <Section title="Identity" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Company Name *"   error={errors.company_name?.message} {...register('company_name')} />
                <Input label="GSTIN *" hint="15 characters" error={errors.gstin?.message} {...register('gstin')} />
                {/* cin: optional, blank=True null=True on model */}
                <Input label="CIN" hint="Optional, max 21 chars" error={errors.cin?.message} {...register('cin')} />
              </div>

              {/* ── Contact ───────────────────────────────────────────── */}
              <Section title="Contact" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Contact Person *" error={errors.contact_person?.message} {...register('contact_person')} />
                <Input label="Contact Email *"  error={errors.contact_email?.message}  {...register('contact_email')} />
                <Input label="Contact Phone *"  error={errors.contact_phone?.message}  {...register('contact_phone')} />
              </div>

              {/* ── Billing Address ───────────────────────────────────── */}
              <Section title="Billing Address" />
              <Input label="Address Line 1 *" error={errors.billing_address_line1?.message} {...register('billing_address_line1')} />
              <Input label="Address Line 2"   {...register('billing_address_line2')} />
              <div className="grid grid-cols-3 gap-4">
                <Input label="City *"    error={errors.billing_city?.message}    {...register('billing_city')} />
                <Input label="State *"   error={errors.billing_state?.message}   {...register('billing_state')} />
                <Input label="Pincode *" error={errors.billing_pincode?.message} {...register('billing_pincode')} />
              </div>

              {/* ── Installation Address ──────────────────────────────── */}
              <div className="flex items-center justify-between pb-1 border-b border-[#f0f4fc] mt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6b7ea8]">
                  Installation Address
                </span>
                <label className="flex items-center gap-2 text-xs text-[#3d4f6e] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-[#004aad]"
                    checked={!!sameAsBilling}
                    onChange={e => handleSameAsBilling(e.target.checked)}
                  />
                  Same as billing address
                </label>
              </div>
              {!sameAsBilling && (
                <>
                  <Input label="Address Line 1 *" error={errors.installation_address_line1?.message} {...register('installation_address_line1')} />
                  <Input label="Address Line 2"   {...register('installation_address_line2')} />
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="City *"    error={errors.installation_city?.message}    {...register('installation_city')} />
                    <Input label="State *"   error={errors.installation_state?.message}   {...register('installation_state')} />
                    <Input label="Pincode *" error={errors.installation_pincode?.message} {...register('installation_pincode')} />
                  </div>
                </>
              )}

              {/* ── Portal Settings ───────────────────────────────────── */}
              <Section title="Portal Settings" />
              <div className="grid grid-cols-3 gap-4">
                <Input  label="Total Users"      type="number" error={errors.total_users?.message} {...register('total_users')} />
                <Input  label="Daily Limit (MB)" type="number" hint="0 = unlimited" {...register('daily_data_limit_mb')} />
                <Select label="Approval Mode"
                  options={[
                    { value: 'manual', label: 'Manual' },
                    { value: 'auto',   label: 'Auto'   },
                  ]}
                  {...register('registration_approval_mode')}
                />
                <Select label="Portal Entry Mode"
                  options={[
                    { value: 'login',          label: 'Login'          },
                    { value: 'register_first', label: 'Register First' },
                  ]}
                  {...register('portal_entry_mode')}
                />
                <Input label="Max Concurrent Sessions" type="number" hint="1–10"          error={errors.max_concurrent_sessions?.message} {...register('max_concurrent_sessions')} />
                <Input label="Max Data Limit (MB)"     type="number" hint="0 = unlimited" {...register('data_limit_mb')} />
              </div>

              {/* ── Session / Timeout ─────────────────────────────────── */}
              <Section title="Session / Timeout" />
              <div className="grid grid-cols-3 gap-4">
                <Input label="Session Timeout (s)" type="number" hint="min 300"  error={errors.session_timeout?.message}    {...register('session_timeout')} />
                <Input label="Idle Timeout (s)"    type="number" hint="min 60"   error={errors.idle_timeout?.message}       {...register('idle_timeout')} />
                <Input label="Time Limit (min)"    type="number" hint="0 = none" error={errors.time_limit_minutes?.message} {...register('time_limit_minutes')} />
              </div>

              {/* ── Bandwidth / QoS ───────────────────────────────────── */}
              <Section title="Bandwidth / QoS" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Throttle Upload (kbps)"   type="number" hint="default 1024" error={errors.throttle_bandwidth_up?.message}   {...register('throttle_bandwidth_up')} />
                <Input label="Throttle Download (kbps)" type="number" hint="default 1024" error={errors.throttle_bandwidth_down?.message} {...register('throttle_bandwidth_down')} />
              </div>

              {/* ── Auth Options ──────────────────────────────────────── */}
              <Section title="Auth Options" />
              <div className="flex flex-wrap gap-6 text-sm text-[#3d4f6e]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[#004aad]" {...register('enable_password_login')} />
                  Password Login
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[#004aad]" {...register('enable_otp_login')} />
                  OTP Login
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[#004aad]" {...register('enable_volume_control')} />
                  Volume Control
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[#004aad]" {...register('device_approval_required')} />
                  Device Approval Required
                </label>
              </div>

              {/* ── Branch / Manager ─────────────────────────────────── */}
              {needsBranch && (
                <>
                  <Section title="Branch / Manager Details" />
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Required because this customer uses
                    {portalEntryMode === 'register_first' ? ' Register First mode' : ''}
                    {deviceApproval ? ' Device Approval' : ''}.
                    At least one of phone or mobile must be provided.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* branch_name: no blank=True on model — defaults to company name if left empty */}
                    <Input
                      label="Branch Name"
                      hint="Defaults to company name if left blank"
                      error={errors.branch_name?.message}
                      {...register('branch_name')}
                    />
                    <Input
                      label="Branch Code"
                      hint="Optional"
                      error={errors.branch_code?.message}
                      {...register('branch_code')}
                    />
                    <Input
                      label="Manager Name"
                      error={errors.manager_name?.message}
                      {...register('manager_name')}
                    />
                    {/* manager_phone: max_length=10, validate_indian_mobile */}
                    <Input
                      label="Manager Phone"
                      hint="10-digit number"
                      error={errors.manager_phone?.message}
                      {...register('manager_phone')}
                    />
                    {/* manager_mobile: max_length=10, validate_indian_mobile */}
                    <Input
                      label="Manager Mobile"
                      hint="10-digit number"
                      error={errors.manager_mobile?.message}
                      {...register('manager_mobile')}
                    />
                    {/* manager_email: EmailField blank=True */}
                    <Input
                      label="Manager Email *"
                      className="col-span-2"
                      error={errors.manager_email?.message}
                      {...register('manager_email')}
                    />
                  </div>
                </>
              )}

              {/* ── Branding ──────────────────────────────────────────── */}
              <Section title="Branding" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Primary Color"   type="color" error={errors.primary_color?.message}   {...register('primary_color')} />
                <Input label="Secondary Color" type="color" error={errors.secondary_color?.message} {...register('secondary_color')} />
                <Input label="Welcome Message" className="col-span-2" {...register('welcome_message')} />
                <Input label="Terms URL"       className="col-span-2" {...register('terms_url')} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={save.isPending}>
                  {isEdit ? 'Save Changes' : 'Create Customer'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/eb')}>
                  Cancel
                </Button>
              </div>

            </CardBody>
          </Card>
        </form>
      </div>
    </div>
  )
}
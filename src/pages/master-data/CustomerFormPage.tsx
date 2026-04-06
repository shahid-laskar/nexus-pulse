import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { customersApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useApiError } from '@/hooks/useApiError'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

const schema = z.object({
  // Identity
  company_name:  z.string().min(2),
  gstin:         z.string().length(15, 'Must be exactly 15 chars'),
  cin:           z.string().max(21).optional(),

  // Branding
  primary_color:   z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  welcome_message: z.string().optional(),
  terms_url:       z.string().optional(),

  // Contact
  contact_person: z.string().min(2),
  contact_email:  z.string().email(),
  contact_phone:  z.string().min(10).max(15),

  // Billing address
  billing_address_line1: z.string().min(5),
  billing_address_line2: z.string().optional(),
  billing_city:          z.string().min(2),
  billing_state:         z.string().min(2),
  billing_pincode:       z.string().regex(/^\d{6}$/, 'Must be 6 digits'),

  // Installation address
  same_as_billing:            z.boolean().optional(),
  installation_address_line1: z.string().optional(),
  installation_address_line2: z.string().optional(),
  installation_city:          z.string().optional(),
  installation_state:         z.string().optional(),
  installation_pincode:       z.string().regex(/^\d{6}$/, 'Must be 6 digits').optional().or(z.literal('')),

  // Auth / portal
  enable_password_login:    z.boolean().optional(),
  enable_otp_login:         z.boolean().optional(),
  enable_volume_control:    z.boolean().optional(),
  portal_entry_mode:        z.enum(['login', 'register_first']).optional(),
  device_approval_required: z.boolean().optional(),

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
})

type FormData = z.infer<typeof schema>

export function CustomerFormPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])
  const navigate = useNavigate()
  const { getError } = useApiError()
  const qc = useQueryClient()

  const { register, handleSubmit, formState: { errors }, control, setValue, getValues } = useForm<FormData>({
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
      primary_color:           '#004aad',
      secondary_color:         '#0066cc',
      enable_password_login:   true,
      enable_otp_login:        false,
      enable_volume_control:   true,
      portal_entry_mode:       'login',
      device_approval_required: false,
      same_as_billing:         true,
    },
  })

  const sameAsBilling = useWatch({ control, name: 'same_as_billing' })

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

  const create = useMutation({
    mutationFn: (data: FormData) => customersApi.create(data),
    onSuccess: (c) => {
      toast.success(`Customer '${c.company_name}' created as DRAFT`)
      qc.invalidateQueries({ queryKey: ['customers'] })
      navigate('/customers')
    },
    onError: (err) => toast.error(getError(err)),
  })

  const Section = ({ title }: { title: string }) => (
    <div className="text-xs font-bold uppercase tracking-wider text-[#6b7ea8] pb-1 border-b border-[#f0f4fc] mt-2">
      {title}
    </div>
  )

  return (
    <div>
      <PageHeader title="Add Customer" subtitle="Saved as DRAFT — EB admin fills details" />
      <div className="p-8 max-w-3xl">
        <form onSubmit={handleSubmit(d => create.mutate(d))}>
          <Card>
            <CardBody className="flex flex-col gap-4">

              {/* ── Identity ─────────────────────────────────────────── */}
              <Section title="Identity" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Company Name *" error={errors.company_name?.message} {...register('company_name')} />
                <Input label="GSTIN *" hint="15 characters" error={errors.gstin?.message} {...register('gstin')} />
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
                  <Input label="Address Line 1" error={errors.installation_address_line1?.message} {...register('installation_address_line1')} />
                  <Input label="Address Line 2" {...register('installation_address_line2')} />
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="City"    error={errors.installation_city?.message}    {...register('installation_city')} />
                    <Input label="State"   error={errors.installation_state?.message}   {...register('installation_state')} />
                    <Input label="Pincode" error={errors.installation_pincode?.message} {...register('installation_pincode')} />
                  </div>
                </>
              )}

              {/* ── Portal Settings ───────────────────────────────────── */}
              <Section title="Portal Settings" />
              <div className="grid grid-cols-3 gap-4">
                <Input  label="Total Users"       type="number" error={errors.total_users?.message} {...register('total_users')} />
                <Input  label="Daily Limit (MB)"  type="number" hint="0 = unlimited" {...register('daily_data_limit_mb')} />
                <Select label="Approval Mode"
                  options={[
                    { value: 'manual', label: 'Manual' },
                    { value: 'auto',   label: 'Auto'   },
                  ]}
                  {...register('registration_approval_mode')}
                />
                <Select label="Portal Entry Mode"
                  options={[
                    { value: 'login',          label: 'Login'            },
                    { value: 'register_first', label: 'Register First'   },
                  ]}
                  {...register('portal_entry_mode')}
                />
                <Input label="Max Concurrent Sessions" type="number" hint="1–10" error={errors.max_concurrent_sessions?.message} {...register('max_concurrent_sessions')} />
                <Input label="Max Data Limit (MB)"     type="number" hint="0 = unlimited" {...register('data_limit_mb')} />
              </div>

              {/* ── Session / Timeout ─────────────────────────────────── */}
              <Section title="Session / Timeout" />
              <div className="grid grid-cols-3 gap-4">
                <Input label="Session Timeout (s)"   type="number" hint="min 300"  error={errors.session_timeout?.message}    {...register('session_timeout')} />
                <Input label="Idle Timeout (s)"      type="number" hint="min 60"   error={errors.idle_timeout?.message}       {...register('idle_timeout')} />
                <Input label="Time Limit (min)"      type="number" hint="0 = none" error={errors.time_limit_minutes?.message} {...register('time_limit_minutes')} />
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

              {/* ── Branding ──────────────────────────────────────────── */}
              <Section title="Branding" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Primary Color"   type="color" error={errors.primary_color?.message}   {...register('primary_color')} />
                <Input label="Secondary Color" type="color" error={errors.secondary_color?.message} {...register('secondary_color')} />
                <Input label="Welcome Message" className="col-span-2" {...register('welcome_message')} />
                <Input label="Terms URL"       className="col-span-2" {...register('terms_url')} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={create.isPending}>Save as DRAFT</Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/customers')}>Cancel</Button>
              </div>

            </CardBody>
          </Card>
        </form>
      </div>
    </div>
  )
}
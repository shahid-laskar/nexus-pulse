import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
import { circlesApi, businessAreasApi } from '@/api/master-data'
import { useAuthStore } from '@/store/auth'
import { useApiError } from '@/hooks/useApiError'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import type { RoleName } from '@/types'

// Creation matrix — what each role can create
const CAN_CREATE: Record<RoleName, RoleName[]> = {
  SUPER_ADMIN:  ['CIRCLE_ADMIN'],
  CIRCLE_ADMIN: ['BA_ADMIN'],
  BA_ADMIN:     ['BA_NOC_ADMIN', 'BA_EB_ADMIN', 'CUSTOMER'],
  BA_NOC_ADMIN: [],
  BA_EB_ADMIN:  [],
  CUSTOMER:     [],
}

const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN:  'Super Admin',
  CIRCLE_ADMIN: 'Circle Admin',
  BA_ADMIN:     'BA Admin',
  BA_NOC_ADMIN: 'BA NOC Admin',
  BA_EB_ADMIN:  'BA EB Admin',
  CUSTOMER:     'Customer Admin',
}

const schema = z.object({
  username:         z.string().min(3, 'Min 3 chars'),
  password:         z.string().min(8, 'Min 8 chars'),
  first_name:       z.string().min(1, 'Required'),
  last_name:        z.string().min(1, 'Required'),
  email:            z.string().email().optional().or(z.literal('')),
  role_name:        z.string().min(1, 'Select a role'),
  circle_id:        z.string().optional(),
  business_area_id: z.string().optional(),
  personnel_no:     z.string().max(8).optional().or(z.literal('')),
  designation:      z.string().optional().or(z.literal('')),
  mobile:           z.string().regex(/^\d*$/, 'Digits only').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export function UserCreatePage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN'])
  const navigate   = useNavigate()
  const { roleName } = useAuthStore()
  const { getError } = useApiError()

  const allowedRoles = roleName ? (CAN_CREATE[roleName] ?? []) : []

  const { data: circles } = useQuery({
    queryKey: ['circles'],
    queryFn:  circlesApi.list,
    enabled:  roleName === 'SUPER_ADMIN',
  })

  const { data: bas } = useQuery({
    queryKey: ['business-areas'],
    queryFn:  businessAreasApi.list,
    enabled:  roleName === 'CIRCLE_ADMIN',
  })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const selectedRole = watch('role_name') as RoleName | undefined

  const create = useMutation({
    mutationFn: (data: FormData) => usersApi.create({
      username:         data.username,
      password:         data.password,
      first_name:       data.first_name,
      last_name:        data.last_name,
      email:            data.email || undefined,
      role_name:        data.role_name as RoleName,
      circle_id:        data.circle_id ? Number(data.circle_id) : undefined,
      business_area_id: data.business_area_id ? Number(data.business_area_id) : undefined,
      personnel_no:     data.personnel_no || undefined,
      designation:      data.designation || undefined,
      mobile:           data.mobile || undefined,
    }),
    onSuccess: (user) => {
      toast.success(`User '${user.username}' created`)
      navigate('/users')
    },
    onError: (err) => toast.error(getError(err)),
  })

  if (!allowedRoles.length) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Create User" subtitle="New portal account" />
        <div className="p-6 lg:p-8 max-w-3xl">
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-6 text-slate-500 text-xs">
              Your role is not authorized to provision new user accounts.
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Create User Account"
        subtitle="Provision a new administrative account within your regional scope"
      />
      <div className="p-6 lg:p-8 max-w-3xl">
        <form onSubmit={handleSubmit((d) => create.mutate(d))}>
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-6 flex flex-col gap-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100">
                Account Credentials
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Username *" error={errors.username?.message} {...register('username')} />
                <Input label="Password *" type="password" error={errors.password?.message} {...register('password')} />
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100 mt-2">
                Personal Details
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name *" error={errors.first_name?.message} {...register('first_name')} />
                <Input label="Last Name *"  error={errors.last_name?.message}  {...register('last_name')} />
                <Input label="Email"        error={errors.email?.message}      {...register('email')} />
                <Input label="Mobile"       error={errors.mobile?.message}     {...register('mobile')} />
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100 mt-2">
                Role &amp; Jurisdiction
              </div>

              <Select
                label="Role *"
                placeholder="— Select Role —"
                options={allowedRoles.map(r => ({ value: r, label: ROLE_LABELS[r] }))}
                error={errors.role_name?.message}
                {...register('role_name')}
              />

              {/* Circle picker — only for SUPER_ADMIN creating CIRCLE_ADMIN */}
              {roleName === 'SUPER_ADMIN' && selectedRole === 'CIRCLE_ADMIN' && (
                <Select
                  label="Circle *"
                  placeholder="— Select Circle —"
                  options={(circles ?? []).map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                  error={errors.circle_id?.message}
                  {...register('circle_id')}
                />
              )}

              {/* BA picker — only for CIRCLE_ADMIN creating BA_ADMIN */}
              {roleName === 'CIRCLE_ADMIN' && selectedRole === 'BA_ADMIN' && (
                <Select
                  label="Business Area *"
                  placeholder="— Select BA —"
                  options={(bas ?? []).map(b => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                  error={errors.business_area_id?.message}
                  {...register('business_area_id')}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input label="Personnel No." hint="8-digit BSNL perno" {...register('personnel_no')} />
                <Input label="Designation" placeholder="e.g. SDE, AGM" {...register('designation')} />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <Button type="submit" variant="primary" size="sm" loading={create.isPending} className="h-8 text-xs">
                  Create User
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/users')} className="h-8 text-xs">
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

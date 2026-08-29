import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
import { useApiError } from '@/hooks/useApiError'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { RoleBadge } from '@/components/ui/Badge'

const schema = z.object({
  first_name:  z.string().min(1, 'Required'),
  last_name:   z.string().min(1, 'Required'),
  email:       z.string().email().optional().or(z.literal('')),
  designation: z.string().optional().or(z.literal('')),
  mobile:      z.string().regex(/^\d*$/, 'Digits only').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export function UserEditPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN'])
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const { getError } = useApiError()
  const qc         = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', id],
    queryFn:  () => usersApi.get(Number(id)),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    values: {
      first_name:  user?.first_name ?? '',
      last_name:   user?.last_name  ?? '',
      email:       user?.email      ?? '',
      designation: user?.profile.designation ?? '',
      mobile:      user?.profile.mobile ?? '',
    },
  })

  const update = useMutation({
    mutationFn: (data: FormData) => usersApi.update(Number(id), {
      first_name:  data.first_name,
      last_name:   data.last_name,
      email:       data.email || undefined,
      designation: data.designation || undefined,
      mobile:      data.mobile || undefined,
    }),
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['users'] })
      navigate('/users')
    },
    onError: (err) => toast.error(getError(err)),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={`Edit User — ${user?.username}`}
        subtitle="Update account details and administrative profile"
      />
      <div className="p-6 lg:p-8 max-w-3xl space-y-6">
        {user && (
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{user.full_name || user.username}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <RoleBadge role={user.profile.role.name} />
                    {user.profile.circle && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        {user.profile.circle.name} ({user.profile.circle.code})
                        {user.profile.business_area && ` / ${user.profile.business_area.code}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <form onSubmit={handleSubmit((d) => update.mutate(d))}>
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-6 flex flex-col gap-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100">
                Personal Information
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name *" error={errors.first_name?.message} {...register('first_name')} />
                <Input label="Last Name *"  error={errors.last_name?.message}  {...register('last_name')} />
                <Input label="Email"        error={errors.email?.message}      {...register('email')} />
                <Input label="Mobile"       error={errors.mobile?.message}     {...register('mobile')} />
              </div>
              <Input label="Designation" {...register('designation')} />
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <Button type="submit" variant="primary" size="sm" loading={update.isPending} className="h-8 text-xs">
                  Save Changes
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

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
    <div>
      <PageHeader
        title={`Edit — ${user?.username}`}
        subtitle="Update user details"
      />
      <div className="p-8 max-w-2xl">
        {user && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-surface rounded-xl border border-hairline">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-white font-bold">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div>
              <div className="font-bold text-foreground">{user.full_name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <RoleBadge role={user.profile.role.name} />
                {user.profile.circle && (
                  <span className="text-xs text-muted-foreground">
                    {user.profile.circle.code}
                    {user.profile.business_area && ` / ${user.profile.business_area.code}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit((d) => update.mutate(d))}>
          <Card>
            <CardBody className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name *" error={errors.first_name?.message} {...register('first_name')} />
                <Input label="Last Name *"  error={errors.last_name?.message}  {...register('last_name')} />
                <Input label="Email"        error={errors.email?.message}      {...register('email')} />
                <Input label="Mobile"       error={errors.mobile?.message}     {...register('mobile')} />
              </div>
              <Input label="Designation" {...register('designation')} />
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={update.isPending}>Save Changes</Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/users')}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        </form>
      </div>
    </div>
  )
}

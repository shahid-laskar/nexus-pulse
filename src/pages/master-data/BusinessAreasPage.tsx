import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { businessAreasApi, circlesApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useApiError } from '@/hooks/useApiError'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  name:      z.string().min(2),
  code:      z.string().min(2).max(20),
  circle_id: z.string().min(1, 'Select a circle'),
})
type FormData = z.infer<typeof schema>

export function BusinessAreasPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN'])
  const { roleName } = useAuthStore()
  const { getError } = useApiError()
  const qc           = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: bas, isLoading } = useQuery({
    queryKey: ['business-areas'],
    queryFn:  businessAreasApi.list,
  })

  const { data: circles } = useQuery({
    queryKey: ['circles'],
    queryFn:  circlesApi.list,
    enabled:  roleName === 'SUPER_ADMIN',
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const create = useMutation({
    mutationFn: (raw: any) => businessAreasApi.create({
      name:      raw.name,
      code:      raw.code,
      circle_id: Number(raw.circle_id),
    }),
    onSuccess: () => {
      toast.success('Business area created')
      qc.invalidateQueries({ queryKey: ['business-areas'] })
      reset(); setShowForm(false)
    },
    onError: (err) => toast.error(getError(err)),
  })

  return (
    <div>
      <PageHeader
        title="Business Areas"
        subtitle="BA structure within circles"
        actions={
          <Button size="sm" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '➕ Add BA'}
          </Button>
        }
      />
      <div className="p-8 flex flex-col gap-6">
        {showForm && (
          <Card className="max-w-md">
            <CardHeader><h3 className="font-semibold text-[#1a2340]">New Business Area</h3></CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit(d => create.mutate(d))} className="flex flex-col gap-4">
                <Input label="Name *" placeholder="Trivandrum" error={errors.name?.message} {...register('name')} />
                <Input label="Code *" placeholder="TVM"        error={errors.code?.message} {...register('code')} />
                {roleName === 'SUPER_ADMIN' && circles && (
                  <Select
                    label="Circle *"
                    placeholder="— Select Circle —"
                    options={circles.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                    error={errors.circle_id?.message}
                    {...register('circle_id')}
                  />
                )}
                <Button type="submit" loading={create.isPending}>Create</Button>
              </form>
            </CardBody>
          </Card>
        )}

        {isLoading ? <PageLoader /> : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th><Th>Code</Th><Th>Circle</Th><Th>Status</Th><Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {!bas?.length
                ? <EmptyRow cols={5} message="No business areas yet" />
                : bas.map(b => (
                  <tr key={b.id} className="hover:bg-[#fafbff]">
                    <Td className="font-semibold">{b.name}</Td>
                    <Td><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{b.code}</code></Td>
                    <Td className="text-[#6b7ea8]">{b.circle.name}</Td>
                    <Td>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{b.is_active ? 'Active' : 'Inactive'}</span>
                    </Td>
                    <Td className="text-[#6b7ea8] text-xs">{new Date(b.created_at).toLocaleDateString()}</Td>
                  </tr>
                ))
              }
            </tbody>
          </Table>
        )}
      </div>
    </div>
  )
}

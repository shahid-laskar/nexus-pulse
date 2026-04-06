import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { circlesApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useApiError } from '@/hooks/useApiError'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'

const schema = z.object({
  name: z.string().min(2, 'Min 2 chars'),
  code: z.string().min(2, 'Min 2 chars').max(20),
})
type FormData = z.infer<typeof schema>

export function CirclesPage() {
  useRequireAuth(['SUPER_ADMIN'])
  const { getError } = useApiError()
  const qc           = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: circles, isLoading } = useQuery({
    queryKey: ['circles'],
    queryFn:  circlesApi.list,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const create = useMutation({
    mutationFn: circlesApi.create,
    onSuccess: () => {
      toast.success('Circle created')
      qc.invalidateQueries({ queryKey: ['circles'] })
      reset()
      setShowForm(false)
    },
    onError: (err) => toast.error(getError(err)),
  })

  return (
    <div>
      <PageHeader
        title="Circles"
        subtitle="BSNL telecom circles"
        actions={
          <Button size="sm" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '➕ Add Circle'}
          </Button>
        }
      />
      <div className="p-8 flex flex-col gap-6">
        {showForm && (
          <Card className="max-w-md">
            <CardHeader><h3 className="font-semibold text-[#1a2340]">New Circle</h3></CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit(d => create.mutate(d))} className="flex flex-col gap-4">
                <Input label="Name *" placeholder="Kerala" error={errors.name?.message} {...register('name')} />
                <Input label="Code *" placeholder="KL"     error={errors.code?.message} {...register('code')} />
                <Button type="submit" loading={create.isPending}>Create</Button>
              </form>
            </CardBody>
          </Card>
        )}

        {isLoading ? <PageLoader /> : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {!circles?.length
                ? <EmptyRow cols={4} message="No circles yet" />
                : circles.map(c => (
                  <tr key={c.id} className="hover:bg-[#fafbff]">
                    <Td className="font-semibold">{c.name}</Td>
                    <Td><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.code}</code></Td>
                    <Td>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                    </Td>
                    <Td className="text-[#6b7ea8] text-xs">{new Date(c.created_at).toLocaleDateString()}</Td>
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

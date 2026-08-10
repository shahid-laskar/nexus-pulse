import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { businessAreasApi, circlesApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/auth'
import type { BusinessAreaWithCircle } from '@/types'

const schema = z.object({
  name:      z.string().min(2),
  code:      z.string().min(2).max(20),
  circle_id: z.string().min(1, 'Select a circle'),
})
type FormData = z.infer<typeof schema>

export function BusinessAreasPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN'])
  const { roleName } = useAuthStore()
  const qc           = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingBA, setEditingBA] = useState<BusinessAreaWithCircle | null>(null)
  const [editName, setEditName] = useState('')

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
    mutationFn: (raw: FormData) => businessAreasApi.create({
      name:      raw.name,
      code:      raw.code,
      circle_id: Number(raw.circle_id),
    }),
    onSuccess: () => {
      toast.success('Business area created')
      qc.invalidateQueries({ queryKey: ['business-areas'] })
      reset(); setShowForm(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to create business area')),
  })

  const updateBA = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; is_active?: boolean } }) =>
      businessAreasApi.update(id, data),
    onSuccess: () => {
      toast.success('Business area updated')
      qc.invalidateQueries({ queryKey: ['business-areas'] })
      setEditingBA(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to update business area')),
  })

  const handleEditClick = (b: BusinessAreaWithCircle) => {
    setEditingBA(b)
    setEditName(b.name)
  }

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
            <CardHeader><h3 className="font-semibold text-foreground">New Business Area</h3></CardHeader>
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

        {editingBA && (
          <Card className="max-w-md border-amber-200 bg-amber-50/20">
            <CardHeader><h3 className="font-semibold text-foreground">Edit Business Area: {editingBA.code}</h3></CardHeader>
            <CardBody>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  updateBA.mutate({ id: editingBA.id, data: { name: editName } })
                }}
                className="flex flex-col gap-4"
              >
                <Input label="Business Area Name *" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditingBA(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" loading={updateBA.isPending}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {isLoading ? <PageLoader /> : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th><Th>Code</Th><Th>Circle</Th><Th>Status</Th><Th>Created</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {!bas?.length
                ? <EmptyRow cols={6} message="No business areas yet" />
                : bas.map(b => (
                  <tr key={b.id} className="hover:bg-surface-2/50">
                    <Td className="font-semibold">{b.name}</Td>
                    <Td><code className="text-xs bg-surface-2 text-foreground border border-hairline px-2 py-0.5 rounded">{b.code}</code></Td>
                    <Td className="text-muted-foreground">{b.circle.name}</Td>
                    <Td>
                      <button
                        onClick={() => updateBA.mutate({ id: b.id, data: { is_active: !b.is_active } })}
                        title="Click to toggle active status"
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${
                          b.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-2 text-foreground border border-hairline text-gray-500'
                        }`}
                      >
                        {b.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </Td>
                    <Td className="text-muted-foreground text-xs">{new Date(b.created_at).toLocaleDateString()}</Td>
                    <Td>
                      <Button size="xs" variant="secondary" onClick={() => handleEditClick(b)}>
                        Edit
                      </Button>
                    </Td>
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

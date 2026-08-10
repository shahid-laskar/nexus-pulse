import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { circlesApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import type { CircleRead } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Min 2 chars'),
  code: z.string().min(2, 'Min 2 chars').max(20),
})
type FormData = z.infer<typeof schema>

export function CirclesPage() {
  useRequireAuth(['SUPER_ADMIN'])
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingCircle, setEditingCircle] = useState<CircleRead | null>(null)
  const [editName, setEditName] = useState('')

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
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to create circle')),
  })

  const updateCircle = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; is_active?: boolean } }) =>
      circlesApi.update(id, data),
    onSuccess: () => {
      toast.success('Circle updated')
      qc.invalidateQueries({ queryKey: ['circles'] })
      setEditingCircle(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to update circle')),
  })

  const handleEditClick = (c: CircleRead) => {
    setEditingCircle(c)
    setEditName(c.name)
  }

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
            <CardHeader><h3 className="font-semibold text-foreground">New Circle</h3></CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit(d => create.mutate(d))} className="flex flex-col gap-4">
                <Input label="Name *" placeholder="Kerala" error={errors.name?.message} {...register('name')} />
                <Input label="Code *" placeholder="KL"     error={errors.code?.message} {...register('code')} />
                <Button type="submit" loading={create.isPending}>Create</Button>
              </form>
            </CardBody>
          </Card>
        )}

        {editingCircle && (
          <Card className="max-w-md border-amber-200 bg-amber-50/20">
            <CardHeader><h3 className="font-semibold text-foreground">Edit Circle: {editingCircle.code}</h3></CardHeader>
            <CardBody>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  updateCircle.mutate({ id: editingCircle.id, data: { name: editName } })
                }}
                className="flex flex-col gap-4"
              >
                <Input label="Circle Name *" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditingCircle(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" loading={updateCircle.isPending}>
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
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {!circles?.length
                ? <EmptyRow cols={5} message="No circles yet" />
                : circles.map(c => (
                  <tr key={c.id} className="hover:bg-surface-2/50">
                    <Td className="font-semibold">{c.name}</Td>
                    <Td><code className="text-xs bg-surface-2 text-foreground border border-hairline px-2 py-0.5 rounded">{c.code}</code></Td>
                    <Td>
                      <button
                        onClick={() => updateCircle.mutate({ id: c.id, data: { is_active: !c.is_active } })}
                        title="Click to toggle active status"
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${
                          c.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-2 text-foreground border border-hairline text-gray-500'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </Td>
                    <Td className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString()}</Td>
                    <Td>
                      <Button size="xs" variant="secondary" onClick={() => handleEditClick(c)}>
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

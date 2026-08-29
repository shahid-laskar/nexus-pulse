import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { circlesApi, vlanPoolsApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/store/auth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { CircleRead, CircleVlanPool } from '@/types'

// ── Add Pool Schema ───────────────────────────────────────────────────

const poolSchema = z
  .object({
    svlan_range_start: z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
    svlan_range_end:   z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
    cvlan_range_start: z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
    cvlan_range_end:   z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
  })
  .refine(data => data.svlan_range_start <= data.svlan_range_end, {
    message: 'SVLAN start must be <= SVLAN end',
    path: ['svlan_range_end'],
  })
  .refine(data => data.cvlan_range_start <= data.cvlan_range_end, {
    message: 'CVLAN start must be <= CVLAN end',
    path: ['cvlan_range_end'],
  })

type PoolFormData = z.infer<typeof poolSchema>

// ── Modal for Adding Pool ─────────────────────────────────────────────

function AddPoolModal({
  circle,
  isOpen,
  onClose,
}: {
  circle: CircleRead
  isOpen: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PoolFormData>({
    resolver: zodResolver(poolSchema) as any,
  })

  const addPool = useMutation({
    mutationFn: (data: PoolFormData) => vlanPoolsApi.create(circle.id, data),
    onSuccess: () => {
      toast.success('VLAN pool added')
      qc.invalidateQueries({ queryKey: ['vlan-pools', circle.id] })
      reset()
      onClose()
    },
    onError: err => toast.error(extractErrorMessage(err, 'Failed to add VLAN pool')),
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Add VLAN Pool — {circle.name} ({circle.code})
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Configure allowed SVLAN and CVLAN boundaries for this circle.
          </p>

          <form onSubmit={handleSubmit(d => addPool.mutate(d))} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SVLAN Start *"
                type="number"
                min={1}
                max={4094}
                placeholder="100"
                error={errors.svlan_range_start?.message}
                {...register('svlan_range_start')}
              />
              <Input
                label="SVLAN End *"
                type="number"
                min={1}
                max={4094}
                placeholder="500"
                error={errors.svlan_range_end?.message}
                {...register('svlan_range_end')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CVLAN Start *"
                type="number"
                min={1}
                max={4094}
                placeholder="10"
                error={errors.cvlan_range_start?.message}
                {...register('cvlan_range_start')}
              />
              <Input
                label="CVLAN End *"
                type="number"
                min={1}
                max={4094}
                placeholder="4000"
                error={errors.cvlan_range_end?.message}
                {...register('cvlan_range_end')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={addPool.isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={addPool.isPending}>
                Add Pool
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── VLAN Pools Expanded Sub-section ───────────────────────────────────

function CircleVlanPoolsSection({ circle }: { circle: CircleRead }) {
  const qc = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [poolToDelete, setPoolToDelete] = useState<CircleVlanPool | null>(null)

  const { data: pools, isLoading } = useQuery({
    queryKey: ['vlan-pools', circle.id],
    queryFn: () => vlanPoolsApi.list(circle.id),
  })

  const deleteMutation = useMutation({
    mutationFn: (poolId: number) => vlanPoolsApi.delete(circle.id, poolId),
    onSuccess: () => {
      toast.success('VLAN pool deleted')
      qc.invalidateQueries({ queryKey: ['vlan-pools', circle.id] })
      setPoolToDelete(null)
    },
    onError: err => toast.error(extractErrorMessage(err, 'Failed to delete VLAN pool')),
  })

  return (
    <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            VLAN Pools for {circle.name} ({circle.code})
          </span>
          <span className="text-xs text-slate-500">({pools?.length || 0} pools)</span>
        </div>
        <Button size="xs" variant="primary" onClick={() => setShowAddModal(true)}>
          ➕ Add Pool
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : !pools?.length ? (
        <div className="text-xs text-slate-500 italic py-2">
          No VLAN pools configured for this circle yet. Click &quot;Add Pool&quot; to define ranges.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 border-b border-slate-200 font-semibold">SVLAN Range</th>
                <th className="p-2 border-b border-slate-200 font-semibold">CVLAN Range</th>
                <th className="p-2 border-b border-slate-200 font-semibold">Created</th>
                <th className="p-2 border-b border-slate-200 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pools.map(p => (
                <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2 font-mono font-medium">
                    {p.svlan_range_start} – {p.svlan_range_end}
                  </td>
                  <td className="p-2 font-mono text-slate-500">
                    {p.cvlan_range_start} – {p.cvlan_range_end}
                  </td>
                  <td className="p-2 text-slate-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-2 text-right">
                    <Button
                      size="xs"
                      variant="danger"
                      onClick={() => setPoolToDelete(p)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddPoolModal
        circle={circle}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <ConfirmDialog
        isOpen={!!poolToDelete}
        title="Delete VLAN Pool"
        description={
          poolToDelete ? (
            <span>
              Are you sure you want to delete VLAN pool with SVLAN range{' '}
              <strong>
                {poolToDelete.svlan_range_start} – {poolToDelete.svlan_range_end}
              </strong>
              ? Active BA SVLAN allocations must not depend on this range.
            </span>
          ) : null
        }
        confirmText="Delete Pool"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (poolToDelete) deleteMutation.mutate(poolToDelete.id)
        }}
        onClose={() => setPoolToDelete(null)}
      />
    </div>
  )
}

// ── Circles Page ──────────────────────────────────────────────────────

export function CirclesPage() {
  useRequireAuth(['SUPER_ADMIN'])
  const { roleName } = useAuthStore()
  const isSuper = roleName === 'SUPER_ADMIN'
  const qc = useQueryClient()
  const [editingCircle, setEditingCircle] = useState<CircleRead | null>(null)
  const [editName, setEditName] = useState('')
  const [expandedCircleId, setExpandedCircleId] = useState<number | null>(null)

  const { data: circles, isLoading } = useQuery({
    queryKey: ['circles'],
    queryFn: circlesApi.list,
  })

  const updateCircle = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; is_active?: boolean } }) =>
      circlesApi.update(id, data),
    onSuccess: () => {
      toast.success('Circle updated')
      qc.invalidateQueries({ queryKey: ['circles'] })
      setEditingCircle(null)
    },
    onError: err => toast.error(extractErrorMessage(err, 'Failed to update circle')),
  })

  const handleEditClick = (c: CircleRead) => {
    setEditingCircle(c)
    setEditName(c.name)
  }

  const toggleExpand = (circleId: number) => {
    setExpandedCircleId(curr => (curr === circleId ? null : circleId))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Circles"
        subtitle="BSNL telecom circles"
      />
      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {editingCircle && (
          <Card className="max-w-md border-amber-200 bg-amber-50/20">
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Edit Circle: {editingCircle.code}</h3>
            </CardHeader>
            <CardBody>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  updateCircle.mutate({ id: editingCircle.id, data: { name: editName } })
                }}
                className="flex flex-col gap-4"
              >
                <Input
                  label="Circle Name *"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingCircle(null)}
                  >
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

        {isLoading ? (
          <PageLoader />
        ) : (
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
              {!circles?.length ? (
                <EmptyRow cols={5} message="No circles yet" />
              ) : (
                circles.map(c => {
                  const isExpanded = expandedCircleId === c.id
                  return (
                    <React.Fragment key={c.id}>
                      <tr className={`hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}>
                        <Td className="font-semibold">{c.name}</Td>
                        <Td>
                          <code className="text-xs bg-slate-100 text-slate-900 border border-slate-200 px-2 py-0.5 rounded">
                            {c.code}
                          </code>
                        </Td>
                        <Td>
                          <button
                            onClick={() =>
                              updateCircle.mutate({
                                id: c.id,
                                data: { is_active: !c.is_active },
                              })
                            }
                            title="Click to toggle active status"
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${
                              c.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-900 border border-slate-200 text-gray-500'
                            }`}
                          >
                            {c.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </Td>
                        <Td className="text-slate-500 text-xs">
                          {new Date(c.created_at).toLocaleDateString()}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <Button size="xs" variant="secondary" onClick={() => handleEditClick(c)}>
                              Edit
                            </Button>
                            {isSuper && (
                              <Button
                                size="xs"
                                variant={isExpanded ? 'primary' : 'secondary'}
                                onClick={() => toggleExpand(c.id)}
                              >
                                {isExpanded ? '▲ Hide Pools' : '▼ VLAN Pools'}
                              </Button>
                            )}
                          </div>
                        </Td>
                      </tr>
                      {isExpanded && isSuper && (
                        <tr>
                          <td colSpan={5} className="p-0 border-b border-slate-200">
                            <CircleVlanPoolsSection circle={c} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  )
}

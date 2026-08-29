import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { businessAreasApi, vlanPoolsApi, baSvlanAllocationsApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'
import type { BusinessAreaWithCircle, BASvlanAllocation } from '@/types'

// ── Allocate SVLAN Schema ─────────────────────────────────────────────

const allocSchema = z
  .object({
    svlan:             z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
    cvlan_range_start: z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
    cvlan_range_end:   z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
    notes:             z.string().optional(),
  })
  .refine(data => data.cvlan_range_start <= data.cvlan_range_end, {
    message: 'CVLAN start must be <= CVLAN end',
    path: ['cvlan_range_end'],
  })

type AllocFormData = z.infer<typeof allocSchema>

// ── Modal for Allocating SVLAN ────────────────────────────────────────

function AllocateSvlanModal({
  ba,
  isOpen,
  onClose,
}: {
  ba: BusinessAreaWithCircle
  isOpen: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AllocFormData>({
    resolver: zodResolver(allocSchema) as any,
  })

  // Fetch parent circle's VLAN pools to display available ranges
  const { data: circlePools, isLoading: loadingPools } = useQuery({
    queryKey: ['vlan-pools', ba.circle_id],
    queryFn: () => vlanPoolsApi.list(ba.circle_id),
    enabled: isOpen,
  })

  const allocate = useMutation({
    mutationFn: (data: AllocFormData) =>
      baSvlanAllocationsApi.create(ba.id, {
        svlan: data.svlan,
        cvlan_range_start: data.cvlan_range_start,
        cvlan_range_end: data.cvlan_range_end,
        notes: data.notes || '',
      }),
    onSuccess: () => {
      toast.success('SVLAN allocated successfully')
      qc.invalidateQueries({ queryKey: ['ba-allocations', ba.id] })
      reset()
      onClose()
    },
    onError: err => toast.error(extractErrorMessage(err, 'Failed to allocate SVLAN')),
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Allocate SVLAN — {ba.name} ({ba.code})
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Parent Circle: <strong>{ba.circle.name} ({ba.circle.code})</strong>
          </p>

          {/* Hint text showing circle pools */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded text-xs mb-4">
            <span className="font-semibold text-slate-900 block mb-1">Circle Allowed Ranges:</span>
            {loadingPools ? (
              <span className="text-slate-500">Loading circle pools...</span>
            ) : !circlePools?.length ? (
              <span className="text-amber-600">
                ⚠️ No VLAN pools defined for circle {ba.circle.code}. Please add a pool in Circles first.
              </span>
            ) : (
              <ul className="list-disc list-inside text-slate-500 space-y-0.5 font-mono">
                {circlePools.map(p => (
                  <li key={p.id}>
                    SVLAN: <strong className="text-slate-900">{p.svlan_range_start}–{p.svlan_range_end}</strong> | CVLAN: {p.cvlan_range_start}–{p.cvlan_range_end}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleSubmit(d => allocate.mutate(d))} className="flex flex-col gap-3">
            <Input
              label="SVLAN *"
              type="number"
              min={1}
              max={4094}
              placeholder="e.g. 101"
              error={errors.svlan?.message}
              {...register('svlan')}
            />

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
                placeholder="1000"
                error={errors.cvlan_range_end?.message}
                {...register('cvlan_range_end')}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-900 mb-1">Notes</label>
              <input
                type="text"
                placeholder="Optional description or tag"
                className="w-full text-xs rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                {...register('notes')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={allocate.isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={allocate.isPending}>
                Allocate SVLAN
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── BA SVLAN Allocations Expanded Sub-section ─────────────────────────

function BusinessAreaSvlanAllocationsSection({ ba }: { ba: BusinessAreaWithCircle }) {
  const qc = useQueryClient()
  const [showAllocModal, setShowAllocModal] = useState(false)
  const [allocToDelete, setAllocToDelete] = useState<BASvlanAllocation | null>(null)

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['ba-allocations', ba.id],
    queryFn: () => baSvlanAllocationsApi.list(ba.id),
  })

  const deleteMutation = useMutation({
    mutationFn: (allocId: number) => baSvlanAllocationsApi.delete(ba.id, allocId),
    onSuccess: () => {
      toast.success('SVLAN allocation deleted')
      qc.invalidateQueries({ queryKey: ['ba-allocations', ba.id] })
      setAllocToDelete(null)
    },
    onError: err => toast.error(extractErrorMessage(err, 'Failed to delete SVLAN allocation')),
  })

  return (
    <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            SVLAN Allocations for {ba.name} ({ba.code})
          </span>
          <span className="text-xs text-slate-500">({allocations?.length || 0} allocations)</span>
        </div>
        <Button size="xs" variant="primary" onClick={() => setShowAllocModal(true)}>
          ➕ Allocate SVLAN
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : !allocations?.length ? (
        <div className="text-xs text-slate-500 italic py-2">
          No SVLANs allocated to this Business Area yet. Click &quot;Allocate SVLAN&quot; to assign one from circle pools.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 border-b border-slate-200 font-semibold">SVLAN</th>
                <th className="p-2 border-b border-slate-200 font-semibold">CVLAN Range</th>
                <th className="p-2 border-b border-slate-200 font-semibold">Status</th>
                <th className="p-2 border-b border-slate-200 font-semibold">Notes</th>
                <th className="p-2 border-b border-slate-200 font-semibold">Created</th>
                <th className="p-2 border-b border-slate-200 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map(a => (
                <tr key={a.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2 font-mono font-bold text-slate-900">
                    {a.svlan}
                  </td>
                  <td className="p-2 font-mono text-slate-500">
                    {a.cvlan_range_start} – {a.cvlan_range_end}
                  </td>
                  <td className="p-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        a.is_exhausted
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {a.is_exhausted ? 'Exhausted' : 'Available'}
                    </span>
                  </td>
                  <td className="p-2 text-slate-500">{a.notes || '—'}</td>
                  <td className="p-2 text-slate-500">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-2 text-right">
                    <Button
                      size="xs"
                      variant="danger"
                      onClick={() => setAllocToDelete(a)}
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

      <AllocateSvlanModal
        ba={ba}
        isOpen={showAllocModal}
        onClose={() => setShowAllocModal(false)}
      />

      <ConfirmDialog
        isOpen={!!allocToDelete}
        title="Delete SVLAN Allocation"
        description={
          allocToDelete ? (
            <span>
              Are you sure you want to delete SVLAN allocation <strong>{allocToDelete.svlan}</strong> for {ba.name}?
              Make sure no provisioned or active customers are using this SVLAN.
            </span>
          ) : null
        }
        confirmText="Delete Allocation"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (allocToDelete) deleteMutation.mutate(allocToDelete.id)
        }}
        onClose={() => setAllocToDelete(null)}
      />
    </div>
  )
}

// ── Business Areas Page ───────────────────────────────────────────────

export function BusinessAreasPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN'])
  const { roleName } = useAuthStore()
  const isSuper = roleName === 'SUPER_ADMIN'
  const qc = useQueryClient()
  const [editingBA, setEditingBA] = useState<BusinessAreaWithCircle | null>(null)
  const [editName, setEditName] = useState('')
  const [expandedBaId, setExpandedBaId] = useState<number | null>(null)

  const { data: bas, isLoading } = useQuery({
    queryKey: ['business-areas'],
    queryFn: businessAreasApi.list,
  })

  const updateBA = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; is_active?: boolean } }) =>
      businessAreasApi.update(id, data),
    onSuccess: () => {
      toast.success('Business area updated')
      qc.invalidateQueries({ queryKey: ['business-areas'] })
      setEditingBA(null)
    },
    onError: err => toast.error(extractErrorMessage(err, 'Failed to update business area')),
  })

  const handleEditClick = (b: BusinessAreaWithCircle) => {
    setEditingBA(b)
    setEditName(b.name)
  }

  const toggleExpand = (baId: number) => {
    setExpandedBaId(curr => (curr === baId ? null : baId))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Business Areas"
        subtitle="BA structure within circles"
      />
      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {editingBA && (
          <Card className="max-w-md border-amber-200 bg-amber-50/20">
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Edit Business Area: {editingBA.code}</h3>
            </CardHeader>
            <CardBody>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  updateBA.mutate({ id: editingBA.id, data: { name: editName } })
                }}
                className="flex flex-col gap-4"
              >
                <Input
                  label="Business Area Name *"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingBA(null)}
                  >
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

        {isLoading ? (
          <PageLoader />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Circle</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {!bas?.length ? (
                <EmptyRow cols={6} message="No business areas yet" />
              ) : (
                bas.map(b => {
                  const isExpanded = expandedBaId === b.id
                  return (
                    <React.Fragment key={b.id}>
                      <tr className={`hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}>
                        <Td className="font-semibold">{b.name}</Td>
                        <Td>
                          <code className="text-xs bg-slate-100 text-slate-900 border border-slate-200 px-2 py-0.5 rounded">
                            {b.code}
                          </code>
                        </Td>
                        <Td className="text-slate-500">{b.circle.name}</Td>
                        <Td>
                          <button
                            onClick={() =>
                              updateBA.mutate({
                                id: b.id,
                                data: { is_active: !b.is_active },
                              })
                            }
                            title="Click to toggle active status"
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${
                              b.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-900 border border-slate-200 text-gray-500'
                            }`}
                          >
                            {b.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </Td>
                        <Td className="text-slate-500 text-xs">
                          {new Date(b.created_at).toLocaleDateString()}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <Button size="xs" variant="secondary" onClick={() => handleEditClick(b)}>
                              Edit
                            </Button>
                            {isSuper && (
                              <Button
                                size="xs"
                                variant={isExpanded ? 'primary' : 'secondary'}
                                onClick={() => toggleExpand(b.id)}
                              >
                                {isExpanded ? '▲ Hide Allocations' : '▼ SVLAN Allocations'}
                              </Button>
                            )}
                          </div>
                        </Td>
                      </tr>
                      {isExpanded && isSuper && (
                        <tr>
                          <td colSpan={6} className="p-0 border-b border-slate-200">
                            <BusinessAreaSvlanAllocationsSection ba={b} />
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

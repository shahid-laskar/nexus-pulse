import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import {
  Globe,
  Building,
  Layers,
  Network,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Check,
  X,
  Radio,
  Server,
} from 'lucide-react'

import {
  circlesApi,
  businessAreasApi,
  vlanPoolsApi,
  baSvlanAllocationsApi,
} from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/store/auth'
import { extractErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { Spinner, PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type {
  CircleRead,
  CircleCreate,
  CircleUpdate,
  BusinessAreaWithCircle,
  BusinessAreaCreate,
  BusinessAreaUpdate,
  CircleVlanPool,
  CircleVlanPoolCreate,
  BASvlanAllocation,
  BASvlanAllocationCreate,
} from '@/types'

// ── Validation Schemas ──────────────────────────────────────────────────

const circleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, 'Only letters and numbers'),
})

const circleUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  is_active: z.boolean().optional(),
})

const baSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, 'Only letters and numbers'),
  circle_id: z.coerce.number().min(1, 'Please select a Circle'),
})

const baUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  is_active: z.boolean().optional(),
})

const circlePoolSchema = z
  .object({
    circle_id: z.coerce.number().min(1, 'Please select a Circle'),
    svlan_range_start: z.coerce.number().min(1).max(4094),
    svlan_range_end: z.coerce.number().min(1).max(4094),
    cvlan_range_start: z.coerce.number().min(1).max(4094),
    cvlan_range_end: z.coerce.number().min(1).max(4094),
  })
  .refine((data) => data.svlan_range_start <= data.svlan_range_end, {
    message: 'SVLAN Start must be <= SVLAN End',
    path: ['svlan_range_end'],
  })
  .refine((data) => data.cvlan_range_start <= data.cvlan_range_end, {
    message: 'CVLAN Start must be <= CVLAN End',
    path: ['cvlan_range_end'],
  })

const baAllocSchema = z
  .object({
    circle_id: z.coerce.number().min(1, 'Please select a Circle'),
    ba_id: z.coerce.number().min(1, 'Please select a Business Area'),
    svlan: z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
    cvlan_range_start: z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
    cvlan_range_end: z.coerce.number().min(1, 'Min 1').max(4094, 'Max 4094'),
    notes: z.string().optional(),
  })
  .refine((data) => data.cvlan_range_start <= data.cvlan_range_end, {
    message: 'CVLAN Start must be <= CVLAN End',
    path: ['cvlan_range_end'],
  })

type CircleFormData = z.infer<typeof circleSchema>
type BAFormData = z.infer<typeof baSchema>
type CirclePoolFormData = z.infer<typeof circlePoolSchema>
type BAAllocFormData = z.infer<typeof baAllocSchema>

// ── Main Unified Master Data Component ──────────────────────────────────

export function MasterDataHubPage() {
  useRequireAuth(['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_NOC_ADMIN'])
  const { isSuper, canManageCircles, canManageBAs } = useAuthStore()
  const qc = useQueryClient()

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'vlans'>('hierarchy')

  // Filtering states
  const [circleSearch, setCircleSearch] = useState('')
  const [baSearch, setBaSearch] = useState('')
  const [baFilterCircleId, setBaFilterCircleId] = useState<string>('ALL')

  const [vlanCircleFilter, setVlanCircleFilter] = useState<string>('ALL')
  const [vlanBaFilter, setVlanBaFilter] = useState<string>('ALL')
  const [vlanSearch, setVlanSearch] = useState('')

  // Modal open states
  const [addCircleOpen, setAddCircleOpen] = useState(false)
  const [editCircleTarget, setEditCircleTarget] = useState<CircleRead | null>(null)

  const [addBaOpen, setAddBaOpen] = useState(false)
  const [editBaTarget, setEditBaTarget] = useState<BusinessAreaWithCircle | null>(null)

  const [addCirclePoolOpen, setAddCirclePoolOpen] = useState(false)
  const [allocateSvlanOpen, setAllocateSvlanOpen] = useState(false)

  const [deletePoolTarget, setDeletePoolTarget] = useState<{ circleId: number; poolId: number } | null>(null)
  const [deleteAllocTarget, setDeleteAllocTarget] = useState<{ baId: number; allocId: number; svlan: number } | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────

  const { data: circles = [], isLoading: loadingCircles } = useQuery({
    queryKey: ['circles'],
    queryFn: () => circlesApi.list(),
  })

  const { data: businessAreas = [], isLoading: loadingBAs } = useQuery({
    queryKey: ['business-areas'],
    queryFn: () => businessAreasApi.list(),
  })

  const { data: allVlanPools = [], isLoading: loadingPools } = useQuery({
    queryKey: ['all-vlan-pools'],
    queryFn: () => vlanPoolsApi.listAll(),
  })

  const { data: allAllocations = [], isLoading: loadingAllocations } = useQuery({
    queryKey: ['all-svlan-allocations'],
    queryFn: () => baSvlanAllocationsApi.listAll(),
  })

  // ── Mutations ─────────────────────────────────────────────────────────

  const createCircleMutation = useMutation({
    mutationFn: (data: CircleFormData) => circlesApi.create(data),
    onSuccess: (res) => {
      toast.success(`Circle "${res.name}" created successfully`)
      qc.invalidateQueries({ queryKey: ['circles'] })
      setAddCircleOpen(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const updateCircleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CircleUpdate }) => circlesApi.update(id, data),
    onSuccess: () => {
      toast.success('Circle updated successfully')
      qc.invalidateQueries({ queryKey: ['circles'] })
      setEditCircleTarget(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const createBaMutation = useMutation({
    mutationFn: (data: BAFormData) => businessAreasApi.create(data),
    onSuccess: (res) => {
      toast.success(`Business Area "${res.name}" created successfully`)
      qc.invalidateQueries({ queryKey: ['business-areas'] })
      setAddBaOpen(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const updateBaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BusinessAreaUpdate }) => businessAreasApi.update(id, data),
    onSuccess: () => {
      toast.success('Business Area updated successfully')
      qc.invalidateQueries({ queryKey: ['business-areas'] })
      setEditBaTarget(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const createCirclePoolMutation = useMutation({
    mutationFn: (data: CirclePoolFormData) =>
      vlanPoolsApi.create(data.circle_id, {
        svlan_range_start: data.svlan_range_start,
        svlan_range_end: data.svlan_range_end,
        cvlan_range_start: data.cvlan_range_start,
        cvlan_range_end: data.cvlan_range_end,
      }),
    onSuccess: () => {
      toast.success('Circle Master VLAN pool created successfully')
      qc.invalidateQueries({ queryKey: ['all-vlan-pools'] })
      setAddCirclePoolOpen(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const deleteCirclePoolMutation = useMutation({
    mutationFn: ({ circleId, poolId }: { circleId: number; poolId: number }) =>
      vlanPoolsApi.delete(circleId, poolId),
    onSuccess: () => {
      toast.success('VLAN pool deleted')
      qc.invalidateQueries({ queryKey: ['all-vlan-pools'] })
      setDeletePoolTarget(null)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err))
      setDeletePoolTarget(null)
    },
  })

  const allocateSvlanMutation = useMutation({
    mutationFn: (data: BAAllocFormData) =>
      baSvlanAllocationsApi.create(data.ba_id, {
        svlan: data.svlan,
        cvlan_range_start: data.cvlan_range_start,
        cvlan_range_end: data.cvlan_range_end,
        notes: data.notes || '',
      }),
    onSuccess: () => {
      toast.success('SVLAN successfully allocated to Business Area')
      qc.invalidateQueries({ queryKey: ['all-svlan-allocations'] })
      setAllocateSvlanOpen(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const deleteAllocMutation = useMutation({
    mutationFn: ({ baId, allocId }: { baId: number; allocId: number }) =>
      baSvlanAllocationsApi.delete(baId, allocId),
    onSuccess: () => {
      toast.success('SVLAN allocation deleted')
      qc.invalidateQueries({ queryKey: ['all-svlan-allocations'] })
      setDeleteAllocTarget(null)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err))
      setDeleteAllocTarget(null)
    },
  })

  // ── Filtered Datasets ─────────────────────────────────────────────────

  const filteredCircles = useMemo(() => {
    return circles.filter(
      (c) =>
        c.name.toLowerCase().includes(circleSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(circleSearch.toLowerCase())
    )
  }, [circles, circleSearch])

  const filteredBAs = useMemo(() => {
    return businessAreas.filter((ba) => {
      const matchCircle = baFilterCircleId === 'ALL' || String(ba.circle_id) === baFilterCircleId
      const matchSearch =
        ba.name.toLowerCase().includes(baSearch.toLowerCase()) ||
        ba.code.toLowerCase().includes(baSearch.toLowerCase()) ||
        ba.circle?.name?.toLowerCase().includes(baSearch.toLowerCase())
      return matchCircle && matchSearch
    })
  }, [businessAreas, baFilterCircleId, baSearch])

  const filteredAllocations = useMemo(() => {
    return allAllocations.filter((alloc) => {
      const matchCircle = vlanCircleFilter === 'ALL' || String(alloc.circle_id) === vlanCircleFilter
      const matchBa = vlanBaFilter === 'ALL' || String(alloc.business_area_id) === vlanBaFilter
      const baObj = businessAreas.find((b) => b.id === alloc.business_area_id)
      const circleObj = circles.find((c) => c.id === alloc.circle_id)
      const searchStr = `${alloc.svlan} ${baObj?.name || ''} ${circleObj?.name || ''} ${alloc.notes || ''}`.toLowerCase()
      const matchSearch = searchStr.includes(vlanSearch.toLowerCase())
      return matchCircle && matchBa && matchSearch
    })
  }, [allAllocations, vlanCircleFilter, vlanBaFilter, vlanSearch, businessAreas, circles])

  const filteredMasterPools = useMemo(() => {
    return allVlanPools.filter((p) => {
      const matchCircle = vlanCircleFilter === 'ALL' || String(p.circle_id) === vlanCircleFilter
      return matchCircle
    })
  }, [allVlanPools, vlanCircleFilter])

  // Count active stats
  const countCircles = circles.length
  const countBAs = businessAreas.length
  const countPools = allVlanPools.length
  const countAllocations = allAllocations.length

  if (loadingCircles && loadingBAs) {
    return <PageLoader />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <PageHeader
        title="Master Data & VLAN Hub"
        description="Unified management of Circles, Business Areas, Master VLAN pools, and allotted SVLAN allocations."
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* KPI Metric Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Circles</p>
              <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{countCircles}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Telecom regional circles</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Business Areas</p>
              <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{countBAs}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Operational subdivisions</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Master VLAN Pools</p>
              <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{countPools}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Circle boundary ranges</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Allotted SVLANs</p>
              <h4 className="text-2xl font-bold text-emerald-600 mt-0.5">{countAllocations}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Assigned to Business Areas</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Network className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Tab Bar */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('hierarchy')}
          className={cn(
            'flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 -mb-px transition-all',
            activeTab === 'hierarchy'
              ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Globe className="h-4 w-4" />
          Geographic Hierarchy (Circles & Business Areas)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vlans')}
          className={cn(
            'flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 -mb-px transition-all',
            activeTab === 'vlans'
              ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Network className="h-4 w-4" />
          VLAN Pools & Allotted Allocations
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          TAB 1: Geographic Hierarchy (Circles & Business Areas)
      ═════════════════════════════════════════════════════════════════ */}
      {activeTab === 'hierarchy' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-150">
          {/* Left Panel: Circles */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Globe className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Telecom Circles</h3>
                  <p className="text-[11px] text-slate-500">Top-level administrative jurisdictions</p>
                </div>
              </div>

              {canManageCircles && (
                <Button
                  variant="primary"
                  size="xs"
                  className="gap-1 h-7 text-xs"
                  onClick={() => setAddCircleOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                  Add Circle
                </Button>
              )}
            </CardHeader>

            <CardBody className="p-0">
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search circles by name or code..."
                    value={circleSearch}
                    onChange={(e) => setCircleSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <Table>
                <thead>
                  <tr>
                    <Th>Circle Name</Th>
                    <Th>Code</Th>
                    <Th>BAs</Th>
                    <Th>Status</Th>
                    {canManageCircles && <Th className="text-right">Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCircles.length === 0 ? (
                    <EmptyRow cols={canManageCircles ? 5 : 4} message="No circles found" />
                  ) : (
                    filteredCircles.map((c) => {
                      const baCount = businessAreas.filter((b) => b.circle_id === c.id).length
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <Td className="font-semibold text-slate-900 text-xs">
                            {c.name}
                          </Td>
                          <Td className="font-mono text-xs font-bold text-slate-600">
                            {c.code}
                          </Td>
                          <Td className="text-xs text-slate-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px]">
                              {baCount} {baCount === 1 ? 'BA' : 'BAs'}
                            </span>
                          </Td>
                          <Td>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold',
                                c.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', c.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                              {c.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </Td>
                          {canManageCircles && (
                            <Td className="text-right">
                              <Button
                                variant="secondary"
                                size="xs"
                                className="h-6 w-6 p-0"
                                onClick={() => setEditCircleTarget(c)}
                                title="Edit Circle"
                              >
                                <Edit2 className="h-3 w-3 text-slate-600" />
                              </Button>
                            </Td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          {/* Right Panel: Business Areas */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-50 text-purple-600">
                  <Building className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Business Areas (BAs)</h3>
                  <p className="text-[11px] text-slate-500">Operational units within circles</p>
                </div>
              </div>

              {canManageBAs && (
                <Button
                  variant="primary"
                  size="xs"
                  className="gap-1 h-7 text-xs"
                  onClick={() => setAddBaOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                  Add BA
                </Button>
              )}
            </CardHeader>

            <CardBody className="p-0">
              <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search BA name or code..."
                    value={baSearch}
                    onChange={(e) => setBaSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <select
                  value={baFilterCircleId}
                  onChange={(e) => setBaFilterCircleId(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="ALL">All Circles ({circles.length})</option>
                  {circles.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <Table>
                <thead>
                  <tr>
                    <Th>Business Area</Th>
                    <Th>Parent Circle</Th>
                    <Th>Code</Th>
                    <Th>Status</Th>
                    {canManageBAs && <Th className="text-right">Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredBAs.length === 0 ? (
                    <EmptyRow cols={canManageBAs ? 5 : 4} message="No business areas found" />
                  ) : (
                    filteredBAs.map((ba) => (
                      <tr key={ba.id} className="hover:bg-slate-50/70 transition-colors">
                        <Td className="font-semibold text-slate-900 text-xs">
                          {ba.name}
                        </Td>
                        <Td className="text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                            <Globe className="h-3 w-3" />
                            {ba.circle?.name || `Circle #${ba.circle_id}`}
                          </span>
                        </Td>
                        <Td className="font-mono text-xs font-bold text-slate-600">
                          {ba.code}
                        </Td>
                        <Td>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold',
                              ba.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', ba.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                            {ba.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </Td>
                        {canManageBAs && (
                          <Td className="text-right">
                            <Button
                              variant="secondary"
                              size="xs"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditBaTarget(ba)}
                              title="Edit Business Area"
                            >
                              <Edit2 className="h-3 w-3 text-slate-600" />
                            </Button>
                          </Td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          TAB 2: VLAN Pools & Allotted Allocations
      ═════════════════════════════════════════════════════════════════ */}
      {activeTab === 'vlans' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Filter Bar & Quick Add Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SVLAN, BA..."
                  value={vlanSearch}
                  onChange={(e) => setVlanSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Circle:</span>
                <select
                  value={vlanCircleFilter}
                  onChange={(e) => {
                    setVlanCircleFilter(e.target.value)
                    setVlanBaFilter('ALL')
                  }}
                  className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="ALL">All Circles</option>
                  {circles.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">BA:</span>
                <select
                  value={vlanBaFilter}
                  onChange={(e) => setVlanBaFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="ALL">All Business Areas</option>
                  {businessAreas
                    .filter((b) => vlanCircleFilter === 'ALL' || String(b.circle_id) === vlanCircleFilter)
                    .map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {isSuper && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setAddCirclePoolOpen(true)}
                >
                  <Layers className="h-3.5 w-3.5 text-amber-600" />
                  Add Circle Pool
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setAllocateSvlanOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Allocate SVLAN to BA
                </Button>
              </div>
            )}
          </div>

          {/* Section 1: Allotted BA SVLAN Allocations Table */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Network className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Allotted SVLAN Allocations ({filteredAllocations.length})
                  </h3>
                  <p className="text-[11.5px] text-slate-500">
                    Active SVLAN assignments and permissible CVLAN ranges per Business Area
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardBody className="p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>SVLAN</Th>
                    <Th>Parent Circle</Th>
                    <Th>Business Area</Th>
                    <Th>Permitted CVLAN Range</Th>
                    <Th>Capacity</Th>
                    <Th>Status</Th>
                    <Th>Notes</Th>
                    {isSuper && <Th className="text-right">Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAllocations.length === 0 ? (
                    <EmptyRow cols={isSuper ? 8 : 7} message="No SVLAN allocations found for the selected filters" />
                  ) : (
                    filteredAllocations.map((alloc) => {
                      const circle = circles.find((c) => c.id === alloc.circle_id)
                      const ba = businessAreas.find((b) => b.id === alloc.business_area_id)
                      const capacity = alloc.cvlan_range_end - alloc.cvlan_range_start + 1

                      return (
                        <tr key={alloc.id} className="hover:bg-slate-50/70 transition-colors">
                          <Td className="font-mono text-xs font-bold text-emerald-700">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                              SVLAN {alloc.svlan}
                            </span>
                          </Td>
                          <Td className="text-xs text-slate-700">
                            {circle?.name || `Circle #${alloc.circle_id}`} ({circle?.code})
                          </Td>
                          <Td className="text-xs font-semibold text-slate-900">
                            {ba?.name || `BA #${alloc.business_area_id}`} ({ba?.code})
                          </Td>
                          <Td className="font-mono text-xs text-slate-700">
                            {alloc.cvlan_range_start} – {alloc.cvlan_range_end}
                          </Td>
                          <Td className="text-xs text-slate-600 font-mono">
                            {capacity} CVLANs
                          </Td>
                          <Td>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold',
                                alloc.is_exhausted
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', alloc.is_exhausted ? 'bg-rose-500' : 'bg-emerald-500')} />
                              {alloc.is_exhausted ? 'Exhausted' : 'Available'}
                            </span>
                          </Td>
                          <Td className="text-xs text-slate-500 max-w-xs truncate">
                            {alloc.notes || '—'}
                          </Td>
                          {isSuper && (
                            <Td className="text-right">
                              <Button
                                variant="danger"
                                size="xs"
                                className="h-6 w-6 p-0"
                                onClick={() =>
                                  setDeleteAllocTarget({
                                    baId: alloc.business_area_id,
                                    allocId: alloc.id,
                                    svlan: alloc.svlan,
                                  })
                                }
                                title="Delete SVLAN Allocation"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </Td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          {/* Section 2: Circle Master VLAN Pools Table */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <Layers className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Circle Master VLAN Pools ({filteredMasterPools.length})
                  </h3>
                  <p className="text-[11.5px] text-slate-500">
                    Defined SVLAN and CVLAN boundary limits per Circle
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardBody className="p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>Circle</Th>
                    <Th>Allowed SVLAN Range</Th>
                    <Th>Allowed CVLAN Range</Th>
                    <Th>Created Date</Th>
                    {isSuper && <Th className="text-right">Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredMasterPools.length === 0 ? (
                    <EmptyRow cols={isSuper ? 5 : 4} message="No master VLAN pools defined for this circle" />
                  ) : (
                    filteredMasterPools.map((pool) => {
                      const circle = circles.find((c) => c.id === pool.circle_id)
                      return (
                        <tr key={pool.id} className="hover:bg-slate-50/70 transition-colors">
                          <Td className="font-semibold text-slate-900 text-xs">
                            {circle?.name || `Circle #${pool.circle_id}`} ({circle?.code})
                          </Td>
                          <Td className="font-mono text-xs text-amber-700 font-bold">
                            SVLAN {pool.svlan_range_start} – {pool.svlan_range_end}
                          </Td>
                          <Td className="font-mono text-xs text-slate-700">
                            CVLAN {pool.cvlan_range_start} – {pool.cvlan_range_end}
                          </Td>
                          <Td className="text-xs text-slate-500 font-mono">
                            {pool.created_at ? new Date(pool.created_at).toLocaleDateString() : '—'}
                          </Td>
                          {isSuper && (
                            <Td className="text-right">
                              <Button
                                variant="danger"
                                size="xs"
                                className="h-6 w-6 p-0"
                                onClick={() =>
                                  setDeletePoolTarget({
                                    circleId: pool.circle_id,
                                    poolId: pool.id,
                                  })
                                }
                                title="Delete Master Pool"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </Td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          MODALS & DIALOGS
      ═════════════════════════════════════════════════════════════════ */}

      {/* 1. Add Circle Modal */}
      {addCircleOpen && (
        <ModalWrapper title="Add New Telecom Circle" onClose={() => setAddCircleOpen(false)}>
          <CircleForm
            onSubmit={(data) => createCircleMutation.mutate(data)}
            isLoading={createCircleMutation.isPending}
            onCancel={() => setAddCircleOpen(false)}
          />
        </ModalWrapper>
      )}

      {/* 2. Edit Circle Modal */}
      {editCircleTarget && (
        <ModalWrapper title={`Edit Circle — ${editCircleTarget.name}`} onClose={() => setEditCircleTarget(null)}>
          <CircleEditForm
            circle={editCircleTarget}
            onSubmit={(data) => updateCircleMutation.mutate({ id: editCircleTarget.id, data })}
            isLoading={updateCircleMutation.isPending}
            onCancel={() => setEditCircleTarget(null)}
          />
        </ModalWrapper>
      )}

      {/* 3. Add Business Area Modal */}
      {addBaOpen && (
        <ModalWrapper title="Add New Business Area" onClose={() => setAddBaOpen(false)}>
          <BAForm
            circles={circles}
            onSubmit={(data) => createBaMutation.mutate(data)}
            isLoading={createBaMutation.isPending}
            onCancel={() => setAddBaOpen(false)}
          />
        </ModalWrapper>
      )}

      {/* 4. Edit Business Area Modal */}
      {editBaTarget && (
        <ModalWrapper title={`Edit Business Area — ${editBaTarget.name}`} onClose={() => setEditBaTarget(null)}>
          <BAEditForm
            ba={editBaTarget}
            onSubmit={(data) => updateBaMutation.mutate({ id: editBaTarget.id, data })}
            isLoading={updateBaMutation.isPending}
            onCancel={() => setEditBaTarget(null)}
          />
        </ModalWrapper>
      )}

      {/* 5. Add Circle Master Pool Modal */}
      {addCirclePoolOpen && (
        <ModalWrapper title="Add Circle Master VLAN Pool" onClose={() => setAddCirclePoolOpen(false)}>
          <CirclePoolForm
            circles={circles}
            onSubmit={(data) => createCirclePoolMutation.mutate(data)}
            isLoading={createCirclePoolMutation.isPending}
            onCancel={() => setAddCirclePoolOpen(false)}
          />
        </ModalWrapper>
      )}

      {/* 6. Allocate SVLAN to BA Modal */}
      {allocateSvlanOpen && (
        <ModalWrapper title="Allocate SVLAN to Business Area" onClose={() => setAllocateSvlanOpen(false)}>
          <AllocateSvlanForm
            circles={circles}
            businessAreas={businessAreas}
            allVlanPools={allVlanPools}
            onSubmit={(data) => allocateSvlanMutation.mutate(data)}
            isLoading={allocateSvlanMutation.isPending}
            onCancel={() => setAllocateSvlanOpen(false)}
          />
        </ModalWrapper>
      )}

      {/* Delete Pool Confirm Dialog */}
      {deletePoolTarget && (
        <ConfirmDialog
          isOpen={Boolean(deletePoolTarget)}
          title="Delete Master VLAN Pool?"
          description="Are you sure you want to delete this master VLAN pool? This operation will be rejected if any BA SVLAN allocations exist within this pool range."
          confirmText="Delete Pool"
          variant="danger"
          isLoading={deleteCirclePoolMutation.isPending}
          onConfirm={() => deleteCirclePoolMutation.mutate(deletePoolTarget)}
          onClose={() => setDeletePoolTarget(null)}
        />
      )}

      {/* Delete Alloc Confirm Dialog */}
      {deleteAllocTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteAllocTarget)}
          title={`Delete SVLAN ${deleteAllocTarget.svlan} Allocation?`}
          description="Are you sure you want to delete this SVLAN allocation? This operation will fail if any active provisioned customers exist on this SVLAN."
          confirmText="Delete Allocation"
          variant="danger"
          isLoading={deleteAllocMutation.isPending}
          onConfirm={() => deleteAllocMutation.mutate(deleteAllocTarget)}
          onClose={() => setDeleteAllocTarget(null)}
        />
      )}
    </div>
  )
}

// ── Modal Wrapper Component ─────────────────────────────────────────────

function ModalWrapper({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full hover:bg-slate-200 text-slate-400 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Sub-forms ───────────────────────────────────────────────────────────

function CircleForm({
  onSubmit,
  isLoading,
  onCancel,
}: {
  onSubmit: (data: CircleFormData) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CircleFormData>({
    resolver: zodResolver(circleSchema) as any,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
      <Input label="Circle Name *" placeholder="e.g. Kerala" error={errors.name?.message} {...register('name')} />
      <Input label="Circle Code *" placeholder="e.g. KL" error={errors.code?.message} {...register('code')} />
      <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
          {isLoading && <Spinner className="h-3 w-3 mr-1" />}
          Create Circle
        </Button>
      </div>
    </form>
  )
}

function CircleEditForm({
  circle,
  onSubmit,
  isLoading,
  onCancel,
}: {
  circle: CircleRead
  onSubmit: (data: CircleUpdate) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CircleUpdate>({
    defaultValues: {
      name: circle.name,
      is_active: circle.is_active,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
      <Input label="Circle Name *" error={errors.name?.message} {...register('name')} />
      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" id="circle_active" className="rounded border-slate-300" {...register('is_active')} />
        <label htmlFor="circle_active" className="font-semibold text-slate-700 cursor-pointer">
          Circle is Active
        </label>
      </div>
      <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
          {isLoading && <Spinner className="h-3 w-3 mr-1" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}

function BAForm({
  circles,
  onSubmit,
  isLoading,
  onCancel,
}: {
  circles: CircleRead[]
  onSubmit: (data: BAFormData) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BAFormData>({
    resolver: zodResolver(baSchema) as any,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
      <Select
        label="Parent Circle *"
        placeholder="Select Circle"
        options={circles.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
        error={errors.circle_id?.message}
        {...register('circle_id')}
      />
      <Input label="Business Area Name *" placeholder="e.g. Trivandrum" error={errors.name?.message} {...register('name')} />
      <Input label="Business Area Code *" placeholder="e.g. TVM" error={errors.code?.message} {...register('code')} />
      <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
          {isLoading && <Spinner className="h-3 w-3 mr-1" />}
          Create Business Area
        </Button>
      </div>
    </form>
  )
}

function BAEditForm({
  ba,
  onSubmit,
  isLoading,
  onCancel,
}: {
  ba: BusinessAreaWithCircle
  onSubmit: (data: BusinessAreaUpdate) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessAreaUpdate>({
    defaultValues: {
      name: ba.name,
      is_active: ba.is_active,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
      <Input label="Business Area Name *" error={errors.name?.message} {...register('name')} />
      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" id="ba_active" className="rounded border-slate-300" {...register('is_active')} />
        <label htmlFor="ba_active" className="font-semibold text-slate-700 cursor-pointer">
          Business Area is Active
        </label>
      </div>
      <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
          {isLoading && <Spinner className="h-3 w-3 mr-1" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}

function CirclePoolForm({
  circles,
  onSubmit,
  isLoading,
  onCancel,
}: {
  circles: CircleRead[]
  onSubmit: (data: CirclePoolFormData) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CirclePoolFormData>({
    resolver: zodResolver(circlePoolSchema) as any,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
      <Select
        label="Target Circle *"
        placeholder="Select Circle"
        options={circles.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
        error={errors.circle_id?.message}
        {...register('circle_id')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="SVLAN Range Start *"
          type="number"
          min={1}
          max={4094}
          placeholder="100"
          error={errors.svlan_range_start?.message}
          {...register('svlan_range_start')}
        />
        <Input
          label="SVLAN Range End *"
          type="number"
          min={1}
          max={4094}
          placeholder="200"
          error={errors.svlan_range_end?.message}
          {...register('svlan_range_end')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="CVLAN Range Start *"
          type="number"
          min={1}
          max={4094}
          placeholder="10"
          error={errors.cvlan_range_start?.message}
          {...register('cvlan_range_start')}
        />
        <Input
          label="CVLAN Range End *"
          type="number"
          min={1}
          max={4094}
          placeholder="4090"
          error={errors.cvlan_range_end?.message}
          {...register('cvlan_range_end')}
        />
      </div>

      <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
          {isLoading && <Spinner className="h-3 w-3 mr-1 text-white" />}
          Create Master Pool
        </Button>
      </div>
    </form>
  )
}

function AllocateSvlanForm({
  circles,
  businessAreas,
  allVlanPools,
  onSubmit,
  isLoading,
  onCancel,
}: {
  circles: CircleRead[]
  businessAreas: BusinessAreaWithCircle[]
  allVlanPools: CircleVlanPool[]
  onSubmit: (data: BAAllocFormData) => void
  isLoading: boolean
  onCancel: () => void
}) {
  const [selectedCircleId, setSelectedCircleId] = useState<number | ''>('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BAAllocFormData>({
    resolver: zodResolver(baAllocSchema) as any,
  })

  const matchingBAs = businessAreas.filter((b) => !selectedCircleId || b.circle_id === Number(selectedCircleId))
  const matchingPools = allVlanPools.filter((p) => !selectedCircleId || p.circle_id === Number(selectedCircleId))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Circle *</label>
          <select
            value={selectedCircleId}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : ''
              setSelectedCircleId(val)
              setValue('circle_id', Number(val))
            }}
            className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">Select Circle</option>
            {circles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          {errors.circle_id && <p className="text-[11px] text-rose-500 mt-1">{errors.circle_id.message}</p>}
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Business Area *</label>
          <select
            disabled={!selectedCircleId}
            {...register('ba_id')}
            className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">Select Business Area</option>
            {matchingBAs.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
          {errors.ba_id && <p className="text-[11px] text-rose-500 mt-1">{errors.ba_id.message}</p>}
        </div>
      </div>

      {/* Hint box showing allowed ranges */}
      {selectedCircleId && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
          <span className="text-[11px] font-bold text-amber-900 uppercase">Circle Allowed Range Constraints:</span>
          {matchingPools.length === 0 ? (
            <p className="text-[11px] text-rose-600">
              ⚠️ No master VLAN pool defined for this circle! Please create a Circle Master Pool first.
            </p>
          ) : (
            <ul className="text-[11px] text-amber-800 list-disc list-inside font-mono space-y-0.5">
              {matchingPools.map((p) => (
                <li key={p.id}>
                  SVLAN: <strong>{p.svlan_range_start}–{p.svlan_range_end}</strong> | CVLAN: {p.cvlan_range_start}–{p.cvlan_range_end}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <Input
          label="SVLAN Number *"
          type="number"
          min={1}
          max={4094}
          placeholder="e.g. 101"
          error={errors.svlan?.message}
          {...register('svlan')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="CVLAN Range Start *"
          type="number"
          min={1}
          max={4094}
          placeholder="10"
          error={errors.cvlan_range_start?.message}
          {...register('cvlan_range_start')}
        />
        <Input
          label="CVLAN Range End *"
          type="number"
          min={1}
          max={4094}
          placeholder="4090"
          error={errors.cvlan_range_end?.message}
          {...register('cvlan_range_end')}
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Notes / Description</label>
        <input
          type="text"
          placeholder="Optional notes or purpose of this SVLAN allocation..."
          className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          {...register('notes')}
        />
      </div>

      <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {isLoading && <Spinner className="h-3 w-3 mr-1 text-white" />}
          Allocate SVLAN
        </Button>
      </div>
    </form>
  )
}

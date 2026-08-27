import { api } from '@/lib/axios'
import type {
  CircleRead, CircleCreate, CircleUpdate,
  BusinessAreaRead, BusinessAreaWithCircle, BusinessAreaCreate, BusinessAreaUpdate,
  CustomerRead, CustomerCreate, CustomerUpdate,
  CustomerNetworkUpdate, CustomerListResponse, PaginationParams,
  CircleVlanPool, CircleVlanPoolCreate, BASvlanAllocation, BASvlanAllocationCreate,
} from '@/types'

// ── Circles ────────────────────────────────────────────────────────────

export const circlesApi = {
  list: async (): Promise<CircleRead[]> => {
    const res = await api.get<CircleRead[]>('/admin/circles/')
    return res.data
  },

  create: async (data: CircleCreate): Promise<CircleRead> => {
    const res = await api.post<CircleRead>('/admin/circles/', data)
    return res.data
  },

  update: async (id: number, data: CircleUpdate): Promise<CircleRead> => {
    const res = await api.put<CircleRead>(`/admin/circles/${id}/`, data)
    return res.data
  },
}

// ── Business Areas ─────────────────────────────────────────────────────

export const businessAreasApi = {
  list: async (): Promise<BusinessAreaWithCircle[]> => {
    const res = await api.get<BusinessAreaWithCircle[]>('/admin/business-areas/')
    return res.data
  },

  create: async (data: BusinessAreaCreate): Promise<BusinessAreaRead> => {
    const res = await api.post<BusinessAreaRead>('/admin/business-areas/', data)
    return res.data
  },

  update: async (id: number, data: BusinessAreaUpdate): Promise<BusinessAreaRead> => {
    const res = await api.put<BusinessAreaRead>(`/admin/business-areas/${id}/`, data)
    return res.data
  },
}

// ── Customers ──────────────────────────────────────────────────────────

export const customersApi = {
  list: async (params?: PaginationParams): Promise<CustomerListResponse> => {
    const res = await api.get<CustomerListResponse>('/admin/customers/', { params })
    return res.data
  },

  get: async (id: number): Promise<CustomerRead> => {
    const res = await api.get<CustomerRead>(`/admin/customers/${id}/`)
    return res.data
  },

  create: async (data: CustomerCreate): Promise<CustomerRead> => {
    const res = await api.post<CustomerRead>('/admin/customers/', data)
    return res.data
  },

  update: async (id: number, data: CustomerUpdate): Promise<CustomerRead> => {
    const res = await api.put<CustomerRead>(`/admin/customers/${id}/`, data)
    return res.data
  },

  updateNetwork: async (
    id: number, data: CustomerNetworkUpdate
  ): Promise<CustomerRead> => {
    const res = await api.patch<CustomerRead>(`/admin/customers/${id}/network/`, data)
    return res.data
  },

  markReady: async (id: number): Promise<CustomerRead> => {
    const res = await api.post<CustomerRead>(`/admin/customers/${id}/ready/`)
    return res.data
  },

  deactivate: async (id: number): Promise<void> => {
    await api.delete(`/admin/customers/${id}/`)
  },
}

// ── VLAN Pools ────────────────────────────────────────────────────────

export const vlanPoolsApi = {
  list: async (circleId: number): Promise<CircleVlanPool[]> => {
    const res = await api.get<CircleVlanPool[]>(`/admin/circles/${circleId}/vlan-pools/`)
    return res.data
  },

  create: async (circleId: number, data: CircleVlanPoolCreate): Promise<CircleVlanPool> => {
    const res = await api.post<CircleVlanPool>(`/admin/circles/${circleId}/vlan-pools/`, data)
    return res.data
  },

  delete: async (circleId: number, poolId: number): Promise<void> => {
    await api.delete(`/admin/circles/${circleId}/vlan-pools/${poolId}/`)
  },
}

// ── BA SVLAN Allocations ──────────────────────────────────────────────

export const baSvlanAllocationsApi = {
  list: async (baId: number): Promise<BASvlanAllocation[]> => {
    const res = await api.get<BASvlanAllocation[]>(`/admin/business-areas/${baId}/svlan-allocations/`)
    return res.data
  },

  create: async (baId: number, data: BASvlanAllocationCreate): Promise<BASvlanAllocation> => {
    const res = await api.post<BASvlanAllocation>(`/admin/business-areas/${baId}/svlan-allocations/`, data)
    return res.data
  },

  delete: async (baId: number, allocId: number): Promise<void> => {
    await api.delete(`/admin/business-areas/${baId}/svlan-allocations/${allocId}/`)
  },
}


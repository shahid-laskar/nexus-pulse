import { api } from '@/lib/axios'
import type {
  CircleRead, CircleCreate, CircleUpdate,
  BusinessAreaRead, BusinessAreaCreate, BusinessAreaUpdate,
  CustomerRead, CustomerCreate, CustomerUpdate,
  CustomerNetworkUpdate, CustomerListResponse,  
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
  list: async (): Promise<BusinessAreaRead[]> => {
    const res = await api.get<BusinessAreaRead[]>('/admin/business-areas/')
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
  list: async (params?: {    
    status?: string
    skip?: number
    limit?: number
  }): Promise<CustomerListResponse> => {
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

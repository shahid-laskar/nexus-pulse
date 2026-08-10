import { api } from '@/lib/axios'
import type {
  CustomerRead, CustomerCreate, CustomerUpdate,
  CustomerListResponse, EBDashboardStats, MarkReadyResponse,
  PaginationParams,
} from '@/types'

export const ebApi = {
  dashboard: async (): Promise<EBDashboardStats> => {
    const res = await api.get<EBDashboardStats>('/eb/dashboard/')
    return res.data
  },

  list: async (params?: PaginationParams): Promise<CustomerListResponse> => {
    const res = await api.get<CustomerListResponse>('/eb/customers/', { params })
    return res.data
  },

  get: async (id: number): Promise<CustomerRead> => {
    const res = await api.get<CustomerRead>(`/eb/customers/${id}/`)
    return res.data
  },

  create: async (data: CustomerCreate): Promise<CustomerRead> => {
    const res = await api.post<CustomerRead>('/eb/customers/', data)
    return res.data
  },

  update: async (id: number, data: CustomerUpdate): Promise<CustomerRead> => {
    const res = await api.put<CustomerRead>(`/eb/customers/${id}/`, data)
    return res.data
  },

  markReady: async (id: number): Promise<MarkReadyResponse> => {
    const res = await api.post<MarkReadyResponse>(`/eb/customers/${id}/ready/`)
    return res.data
  },

  deactivate: async (id: number): Promise<void> => {
    await api.delete(`/eb/customers/${id}/`)
  },
}

import { api } from '@/lib/axios'
import type {
  CustomerRead, CustomerCreate, CustomerUpdate,
  CustomerListResponse, EBDashboardStats, MarkReadyResponse,
  PaginationParams,
  ChangeRequest, ChangeRequestCreate,
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

  uploadLogo: async (id: number, file: File): Promise<{ logo_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<{ logo_url: string }>(`/eb/customers/${id}/logo/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  uploadBanner: async (id: number, file: File): Promise<{ banner_image_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<{ banner_image_url: string }>(`/eb/customers/${id}/banner/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  uploadLegalDoc: async (id: number, file: File): Promise<{ legal_doc_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<{ legal_doc_url: string }>(`/eb/customers/${id}/legal-doc/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  // ── Change Requests ──────────────────────────────────────────────────

  listChangeRequests: async (customerId: number): Promise<ChangeRequest[]> => {
    const res = await api.get<ChangeRequest[]>(`/eb/customers/${customerId}/change-requests/`)
    return res.data
  },

  getChangeRequest: async (reqId: number): Promise<ChangeRequest> => {
    const res = await api.get<ChangeRequest>(`/eb/change-requests/${reqId}/`)
    return res.data
  },

  createChangeRequest: async (customerId: number, data: ChangeRequestCreate): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(`/eb/customers/${customerId}/change-requests/`, data)
    return res.data
  },

  resubmitChangeRequest: async (reqId: number, data: ChangeRequestCreate): Promise<ChangeRequest> => {
    const res = await api.put<ChangeRequest>(`/eb/change-requests/${reqId}/resubmit/`, data)
    return res.data
  },
}



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

  unmarkReady: async (id: number): Promise<MarkReadyResponse> => {
    const res = await api.post<MarkReadyResponse>(`/eb/customers/${id}/unmark-ready/`)
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

  // ── Legal Compliance Documents (ToS / Privacy / FUP) ──────────────────

  listLegalDocs: async (customerId: number): Promise<{ legal_documents: Array<{ id: number; doc_type: string; title: string; version: number; is_active: boolean; body_html?: string; effective_date?: string; requires_reacceptance?: boolean }> }> => {
    const res = await api.get(`/eb/customers/${customerId}/legal-documents/`)
    return res.data
  },

  getLegalDoc: async (customerId: number, docType: string): Promise<{ id: number; doc_type: string; title: string; version: number; body_html: string; effective_date?: string; requires_reacceptance?: boolean }> => {
    const res = await api.get(`/eb/customers/${customerId}/legal-documents/${docType}/`)
    return res.data
  },

  updateLegalDoc: async (
    customerId: number,
    docType: string,
    data: { title?: string; body_html?: string; effective_date?: string; requires_reacceptance?: boolean }
  ): Promise<any> => {
    const res = await api.put(`/eb/customers/${customerId}/legal-documents/${docType}/`, data)
    return res.data
  },

  // ── Bandwidth Profiles (Bronze, Silver, Gold, Platinum & LAN-Only) ────

  listProfiles: async (customerId: number): Promise<{ customer_id: number; profiles: any[] }> => {
    const res = await api.get(`/eb/customers/${customerId}/profiles/`)
    return res.data
  },

  updateProfile: async (customerId: number, profileName: string, data: any): Promise<any> => {
    const res = await api.put(`/eb/customers/${customerId}/profiles/${profileName}/`, data)
    return res.data
  },

  // ── Change Requests ──────────────────────────────────────────────────

  listAllChangeRequests: async (params?: { status?: string; customer_id?: number; skip?: number; limit?: number }): Promise<ChangeRequest[]> => {
    const res = await api.get<ChangeRequest[]>('/eb/change-requests/', { params })
    return res.data
  },

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

  // ── Audit Logs ────────────────────────────────────────────────────────

  listAuditLogs: async (params?: { customer_id?: number; action?: string; category?: string; skip?: number; limit?: number }): Promise<{ total: number; items: any[] }> => {
    const res = await api.get<{ total: number; items: any[] }>('/eb/audit-logs/', { params })
    return res.data
  },
}



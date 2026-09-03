import { api } from '@/lib/axios'
import type {
  HistoricalSessionRecord,
  IPDRExportParams,
  PaginatedIPDRResponse,
  ReverseNATLookupParams,
  ReverseNATResponse,
  SubscriberIdentityProfile,
  SubscriberLookupParams,
  SubscriberSearchQuery,
  SubscriberSearchResponse,
  SubscriberSessionsResponse,
} from '@/types'

export const ipdrApi = {
  /**
   * Search NAT flow records by subscriber private IP and time window.
   */
  subscriberLookup: async (params: SubscriberLookupParams): Promise<PaginatedIPDRResponse> => {
    const res = await api.get<PaginatedIPDRResponse>('/admin/ipdr/subscriber-lookup/', {
      params: {
        source_ip: params.source_ip,
        time_from: params.time_from,
        time_to: params.time_to,
        vyos_instance_id: params.vyos_instance_id,
        page: params.page ?? 1,
        page_size: params.page_size ?? 100,
      },
    })
    return res.data
  },

  /**
   * Reverse NAT trace for Law Enforcement Agencies (LEA).
   */
  reverseNatLookup: async (params: ReverseNATLookupParams): Promise<ReverseNATResponse> => {
    const res = await api.get<ReverseNATResponse>('/admin/ipdr/reverse-nat-lookup/', {
      params: {
        public_ip: params.public_ip,
        nat_port: params.nat_port,
        timestamp: params.timestamp,
        time_tolerance_seconds: params.time_tolerance_seconds ?? 0,
        vyos_instance_id: params.vyos_instance_id,
      },
    })
    return res.data
  },

  /**
   * Multi-identifier subscriber identity search (Task 5.3).
   */
  searchSubscribers: async (params: SubscriberSearchQuery): Promise<SubscriberSearchResponse> => {
    const res = await api.get<SubscriberSearchResponse>('/admin/ipdr/subscribers/search/', {
      params: {
        query: params.query,
        username: params.username,
        phone: params.phone,
        email: params.email,
        mac_address: params.mac_address,
        session_id: params.session_id,
        ip_address: params.ip_address,
        user_id: params.user_id,
        customer_id: params.customer_id,
        customer_name: params.customer_name,
        vyos_instance_id: params.vyos_instance_id,
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    })
    return res.data
  },

  /**
   * Get subscriber identity profile by user ID.
   */
  getSubscriberIdentity: async (userId: number): Promise<SubscriberIdentityProfile> => {
    const res = await api.get<SubscriberIdentityProfile>(`/admin/ipdr/subscribers/${userId}/`)
    return res.data
  },

  /**
   * Get historical session timeline and IP assignment history for a subscriber.
   */
  getSubscriberSessions: async (
    userId: number,
    options?: {
      page?: number
      page_size?: number
      time_from?: string
      time_to?: string
    },
  ): Promise<SubscriberSessionsResponse> => {
    const res = await api.get<SubscriberSessionsResponse>(`/admin/ipdr/subscribers/${userId}/sessions/`, {
      params: {
        page: options?.page ?? 1,
        page_size: options?.page_size ?? 50,
        time_from: options?.time_from,
        time_to: options?.time_to,
      },
    })
    return res.data
  },

  /**
   * Generates direct download URL for IPDR CSV export.
   */
  exportCsvUrl: (params: IPDRExportParams): string => {
    const query = new URLSearchParams({
      source_ip: params.source_ip,
      time_from: params.time_from,
      time_to: params.time_to,
      limit: String(params.limit ?? 100000),
    })
    return `/api/v1/admin/ipdr/export/?${query.toString()}`
  },

  /**
   * Streams/downloads CSV blob directly via authenticated axios client.
   */
  downloadCsv: async (params: IPDRExportParams): Promise<Blob> => {
    const res = await api.get('/admin/ipdr/export/', {
      params: {
        source_ip: params.source_ip,
        time_from: params.time_from,
        time_to: params.time_to,
        limit: params.limit ?? 100000,
      },
      responseType: 'blob',
    })
    return res.data
  },
}

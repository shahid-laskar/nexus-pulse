import { api } from '@/lib/axios'
import type {
  IPDRExportParams,
  PaginatedIPDRResponse,
  ReverseNATLookupParams,
  ReverseNATResponse,
  SubscriberLookupParams,
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

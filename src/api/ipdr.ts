import { api } from '@/lib/axios'
import type {
  CaseFilterParams,
  HistoricalSessionRecord,
  IPDRCaseCreate,
  IPDRCaseListResponse,
  IPDRCaseQueryCreate,
  IPDRCaseQueryRead,
  IPDRCaseRead,
  IPDRCaseStatusUpdate,
  IPDRCaseUpdate,
  IPDRExportParams,
  IPDRReportExportParams,
  IPDRReportJobCreate,
  IPDRReportJobListResponse,
  IPDRReportJobRead,
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
   * Get NAT flow events for a specific subscriber session window (Task 5.5 drilldown).
   */
  getSubscriberSessionFlows: async (
    userId: number,
    sessionId: string,
    options?: {
      page?: number
      page_size?: number
    },
  ): Promise<PaginatedIPDRResponse> => {
    const res = await api.get<PaginatedIPDRResponse>(
      `/admin/ipdr/subscribers/${userId}/sessions/${sessionId}/flows/`,
      {
        params: {
          page: options?.page ?? 1,
          page_size: options?.page_size ?? 100,
        },
      },
    )
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

  // ── LEA Case Management (Task 5.6) ──────────────────────────────────────────

  /**
   * Create a new LEA investigation case.
   */
  createCase: async (payload: IPDRCaseCreate): Promise<IPDRCaseRead> => {
    const res = await api.post<IPDRCaseRead>('/admin/ipdr/cases/', payload)
    return res.data
  },

  /**
   * List investigation cases with filtering and pagination.
   */
  listCases: async (params?: CaseFilterParams): Promise<IPDRCaseListResponse> => {
    const res = await api.get<IPDRCaseListResponse>('/admin/ipdr/cases/', {
      params: {
        status: params?.status,
        priority: params?.priority,
        agency: params?.agency,
        search: params?.search,
        page: params?.page ?? 1,
        page_size: params?.page_size ?? 20,
      },
    })
    return res.data
  },

  /**
   * Retrieve case details by ID.
   */
  getCase: async (caseId: number): Promise<IPDRCaseRead> => {
    const res = await api.get<IPDRCaseRead>(`/admin/ipdr/cases/${caseId}/`)
    return res.data
  },

  /**
   * Update case metadata.
   */
  updateCase: async (caseId: number, payload: IPDRCaseUpdate): Promise<IPDRCaseRead> => {
    const res = await api.patch<IPDRCaseRead>(`/admin/ipdr/cases/${caseId}/`, payload)
    return res.data
  },

  /**
   * Update case lifecycle status (OPEN -> INVESTIGATING -> REPORT_READY -> CLOSED).
   */
  updateCaseStatus: async (caseId: number, payload: IPDRCaseStatusUpdate): Promise<IPDRCaseRead> => {
    const res = await api.patch<IPDRCaseRead>(`/admin/ipdr/cases/${caseId}/status/`, payload)
    return res.data
  },

  /**
   * Attach an executed investigation query to a case.
   */
  attachCaseQuery: async (caseId: number, payload: IPDRCaseQueryCreate): Promise<IPDRCaseQueryRead> => {
    const res = await api.post<IPDRCaseQueryRead>(`/admin/ipdr/cases/${caseId}/queries/`, payload)
    return res.data
  },

  /**
   * List all queries attached to an investigation case.
   */
  listCaseQueries: async (caseId: number): Promise<IPDRCaseQueryRead[]> => {
    const res = await api.get<IPDRCaseQueryRead[]>(`/admin/ipdr/cases/${caseId}/queries/`)
    return res.data
  },

  // ── DoT-Oriented Report Generator (Task 5.7) ───────────────────────────

  /**
   * Generates and downloads a canonical DoT compliance report.
   */
  exportRegulatoryReport: async (
    params: IPDRReportExportParams,
  ): Promise<{ blob: Blob; filename: string; sha256: string; reportId: string }> => {
    const res = await api.get('/admin/ipdr/reports/export', {
      params,
      responseType: 'blob',
    })
    const disposition = (res.headers['content-disposition'] as string) || ''
    let filename = `DoT_IPDR_Report.${params.format.toLowerCase()}`
    const match = disposition.match(/filename="?([^"]+)"?/)
    if (match && match[1]) {
      filename = match[1]
    }
    const sha256 = (res.headers['x-report-sha256'] as string) || ''
    const reportId = (res.headers['x-report-id'] as string) || ''
    return {
      blob: res.data,
      filename,
      sha256,
      reportId,
    }
  },

  /**
   * Enqueue an asynchronous export job.
   */
  createReportJob: async (payload: IPDRReportJobCreate): Promise<IPDRReportJobRead> => {
    const res = await api.post<IPDRReportJobRead>('/admin/ipdr/reports/jobs/', payload)
    return res.data
  },

  /**
   * List recent report export jobs.
   */
  listReportJobs: async (limit?: number): Promise<IPDRReportJobListResponse> => {
    const res = await api.get<IPDRReportJobListResponse>('/admin/ipdr/reports/jobs/', {
      params: { limit: limit ?? 50 },
    })
    return res.data
  },

  /**
   * Retrieve report job progress and metadata.
   */
  getReportJob: async (jobId: string): Promise<IPDRReportJobRead> => {
    const res = await api.get<IPDRReportJobRead>(`/admin/ipdr/reports/jobs/${jobId}/`)
    return res.data
  },

  /**
   * Download a completed report artifact from a background job.
   */
  downloadReportJobArtifact: async (
    jobId: string,
  ): Promise<{ blob: Blob; filename: string; sha256: string }> => {
    const res = await api.get(`/admin/ipdr/reports/jobs/${jobId}/download/`, {
      responseType: 'blob',
    })
    const disposition = (res.headers['content-disposition'] as string) || ''
    let filename = `DoT_Report_${jobId}.bin`
    const match = disposition.match(/filename="?([^"]+)"?/)
    if (match && match[1]) {
      filename = match[1]
    }
    const sha256 = (res.headers['x-report-sha256'] as string) || ''
    return {
      blob: res.data,
      filename,
      sha256,
    }
  },
}



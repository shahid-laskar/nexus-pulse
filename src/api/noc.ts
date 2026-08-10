import { api } from '@/lib/axios'
import type {
  HealthResponse, OnboardResponse, DeBoardResponse,
  SessionListResponse, FlushSessionsResponse, TCStatusResponse,
  ProfilesListResponse, QoSStatsResponse, ConntrackResponse,
  NftablesStatusResponse, InstanceRead,
} from '@/types'

export const nocApi = {
  health: async (instanceId: number): Promise<HealthResponse> => {
    const res = await api.get<HealthResponse>(`/noc/health/${instanceId}/`)
    return res.data
  },

  listInstances: async (): Promise<InstanceRead[]> => {
    const res = await api.get<InstanceRead[]>('/noc/instances/')
    return res.data
  },

  onboard: async (customerId: number): Promise<OnboardResponse> => {
    const res = await api.post<OnboardResponse>(`/noc/customers/${customerId}/onboard/`, {}, { timeout: 150_000 })
    return res.data
  },

  deboard: async (customerId: number): Promise<DeBoardResponse> => {
    const res = await api.post<DeBoardResponse>(`/noc/customers/${customerId}/deboard/`)
    return res.data
  },

  listSessions: async (customerId: number): Promise<SessionListResponse> => {
    const res = await api.get<SessionListResponse>(`/noc/customers/${customerId}/sessions/`)
    return res.data
  },

  flushSessions: async (customerId: number): Promise<FlushSessionsResponse> => {
    const res = await api.delete<FlushSessionsResponse>(`/noc/customers/${customerId}/sessions/`)
    return res.data
  },

  disconnectSession: async (customerId: number, ip: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/noc/customers/${customerId}/sessions/${ip}/`)
    return res.data
  },

  getTCStatus: async (customerId: number): Promise<TCStatusResponse> => {
    const res = await api.get<TCStatusResponse>(`/noc/customers/${customerId}/tc/`)
    return res.data
  },

  updateTCMaxBandwidth: async (customerId: number, maxBandwidth: string): Promise<TCStatusResponse> => {
    const res = await api.put<TCStatusResponse>(`/noc/customers/${customerId}/tc/max-bandwidth/`, null, {
      params: { max_bandwidth: maxBandwidth },
    })
    return res.data
  },

  listProfiles: async (customerId: number): Promise<ProfilesListResponse> => {
    const res = await api.get<ProfilesListResponse>(`/noc/customers/${customerId}/profiles/`)
    return res.data
  },

  provisionQoS: async (customerId: number, ip: string, profileId: number): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>(`/noc/customers/${customerId}/qos/`, {
      ip_address: ip,
      bandwidth_profile_id: profileId,
    })
    return res.data
  },

  removeQoS: async (customerId: number, ip: string, profileId: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/noc/customers/${customerId}/qos/`, {
      data: { ip_address: ip, profile_id: profileId },
    })
    return res.data
  },

  getQoSStats: async (customerId: number, ip: string, profileId: number): Promise<QoSStatsResponse> => {
    const res = await api.get<QoSStatsResponse>(`/noc/customers/${customerId}/qos/${ip}/stats/`, {
      params: { profile_id: profileId },
    })
    return res.data
  },

  listConntrack: async (customerId: number): Promise<ConntrackResponse> => {
    const res = await api.get<ConntrackResponse>(`/noc/customers/${customerId}/conntrack/`)
    return res.data
  },

  flushConntrack: async (customerId: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/noc/customers/${customerId}/conntrack/`)
    return res.data
  },

  getNftablesStatus: async (customerId: number): Promise<NftablesStatusResponse> => {
    const res = await api.get<NftablesStatusResponse>(`/noc/customers/${customerId}/status/`)
    return res.data
  },

  getUpstreamCustomer: async (customerId: number): Promise<unknown> => {
    const res = await api.get(`/noc/customers/${customerId}/upstream/`)
    return res.data
  },

  updateUpstreamCustomer: async (customerId: number, payload: unknown): Promise<unknown> => {
    const res = await api.put(`/noc/customers/${customerId}/upstream/`, payload)
    return res.data
  },

  listUpstreamUsers: async (customerId: number): Promise<unknown> => {
    const res = await api.get(`/noc/customers/${customerId}/users/`)
    return res.data
  },

  createUpstreamUser: async (customerId: number, payload: unknown): Promise<unknown> => {
    const res = await api.post(`/noc/customers/${customerId}/users/`, payload)
    return res.data
  },

  updateUpstreamUser: async (customerId: number, username: string, payload: unknown): Promise<unknown> => {
    const res = await api.put(`/noc/customers/${customerId}/users/${username}/`, payload)
    return res.data
  },

  deleteUpstreamUser: async (customerId: number, username: string): Promise<unknown> => {
    const res = await api.delete(`/noc/customers/${customerId}/users/${username}/`)
    return res.data
  },

  listAlerts: async (): Promise<any[]> => {
    const res = await api.get('/noc/alerts/')
    return res.data
  },

  ackAlert: async (alertId: number): Promise<any> => {
    const res = await api.put(`/noc/alerts/${alertId}/ack/`)
    return res.data
  },

  getAuthFailures: async (customerId: number): Promise<any> => {
    const res = await api.get(`/noc/customers/${customerId}/auth-failures/`)
    return res.data
  },

  getInstanceMetrics: async (instanceId: number): Promise<any> => {
    const res = await api.get(`/noc/instances/${instanceId}/metrics/`)
    return res.data
  },
}

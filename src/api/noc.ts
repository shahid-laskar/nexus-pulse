import { api } from '@/lib/axios'
import type { HealthResponse, OnboardResponse, SessionRead } from '@/types'

export const nocApi = {
  health: async (instanceId: number): Promise<HealthResponse> => {
    const res = await api.get<HealthResponse>(`/noc/health/${instanceId}/`)
    return res.data
  },

  onboard: async (customerId: number): Promise<OnboardResponse> => {
    const res = await api.post<OnboardResponse>(`/noc/customers/${customerId}/onboard/`, {}, { timeout: 150_000 })
    return res.data
  },

  deboard: async (customerId: number) => {
    const res = await api.post(`/noc/customers/${customerId}/deboard/`)
    return res.data
  },

  listSessions: async (customerId: number): Promise<{ sessions: SessionRead[]; session_count: number }> => {
    const res = await api.get(`/noc/customers/${customerId}/sessions/`)
    return res.data
  },

  flushSessions: async (customerId: number) => {
    const res = await api.delete(`/noc/customers/${customerId}/sessions/`)
    return res.data
  },

  disconnectSession: async (customerId: number, ip: string) => {
    const res = await api.delete(`/noc/customers/${customerId}/sessions/${ip}/`)
    return res.data
  },

  getTCStatus: async (customerId: number) => {
    const res = await api.get(`/noc/customers/${customerId}/tc/`)
    return res.data
  },
}

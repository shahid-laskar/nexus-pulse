import { api } from '@/lib/axios'
import type {
  HealthResponse, OnboardResponse, DeBoardResponse,
  SessionListResponse, FlushSessionsResponse, TCStatusResponse,
  ProfilesListResponse, QoSStatsResponse, ConntrackResponse,
  NftablesStatusResponse, InstanceRead, UpstreamUserRead,
  PendingRegistrationsResponse,
  RouterProposal, RouterProposalCreate, RouterProposalUpdate,
  RouterProposalApprove, RouterProposalReject, RouterProposalReturn,
  ChangeRequest, ChangeRequestReview,
  IpCalculatorRequest, IpCalculatorResponse,
  NetworkProvisionPayload, NetworkProvisionResponse,
  DhcpSetupPayload, DnsSetupPayload,
  IpSubnetPool, IpSubnetPoolCreate,
  InstanceTopologyResponse,
  UnintegratedCustomer, AdoptCustomerPayload, AdoptCustomerResponse,
} from '@/types'

export const nocApi = {
  health: async (instanceId: number): Promise<HealthResponse> => {
    const res = await api.get<HealthResponse>(`/noc/health/${instanceId}/`)
    return res.data
  },

  listInstances: async (): Promise<InstanceRead[]> => {
    const res = await api.get<any>('/noc/instances/')
    const data = res.data
    const list = Array.isArray(data) ? data : (data?.instances || [])
    return list.map((inst: any) => ({
      ...inst,
      id: inst.instance_id ?? inst.id ?? 1,
      instance_id: inst.instance_id ?? inst.id ?? 1,
      host: inst.network?.vyos_ip || inst.host || inst.vyos_ip || '',
      ssh_port: inst.auth?.ssh_port || inst.ssh_port || 22,
    }))
  },

  getInstance: async (instanceId: number): Promise<InstanceRead> => {
    const res = await api.get<any>(`/noc/instances/${instanceId}/`)
    const inst = res.data
    return {
      ...inst,
      id: inst.instance_id ?? inst.id ?? instanceId,
      instance_id: inst.instance_id ?? inst.id ?? instanceId,
      host: inst.network?.vyos_ip || inst.host || inst.vyos_ip || '',
      ssh_port: inst.auth?.ssh_port || inst.ssh_port || 22,
    }
  },

  getInstanceTopology: async (instanceId: number): Promise<InstanceTopologyResponse> => {
    const res = await api.get<InstanceTopologyResponse>(`/noc/instances/${instanceId}/topology/`)
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

  rollbackNetwork: async (customerId: number): Promise<{ customer_id: number; company_name: string; message: string }> => {
    const res = await api.post<{ customer_id: number; company_name: string; message: string }>(`/noc/customers/${customerId}/rollback-network/`)
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

  getUpstreamCustomer: async (customerId: number): Promise<any> => {
    const res = await api.get<any>(`/noc/customers/${customerId}/upstream/`)
    return res.data
  },

  updateUpstreamCustomer: async (customerId: number, payload: any): Promise<any> => {
    const res = await api.put<any>(`/noc/customers/${customerId}/upstream/`, payload)
    return res.data
  },

  listUpstreamUsers: async (customerId: number): Promise<{ users: UpstreamUserRead[] } | any> => {
    const res = await api.get<{ users: UpstreamUserRead[] } | any>(`/noc/customers/${customerId}/users/`)
    return res.data
  },

  createUpstreamUser: async (customerId: number, payload: any): Promise<any> => {
    const res = await api.post<any>(`/noc/customers/${customerId}/users/`, payload)
    return res.data
  },

  updateUpstreamUser: async (customerId: number, username: string, payload: any): Promise<any> => {
    const res = await api.put<any>(`/noc/customers/${customerId}/users/${username}/`, payload)
    return res.data
  },

  deleteUpstreamUser: async (customerId: number, username: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/noc/customers/${customerId}/users/${username}/`)
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

  listPendingRegistrations: async (customerId?: number): Promise<PendingRegistrationsResponse> => {
    if (customerId) {
      const res = await api.get<PendingRegistrationsResponse>(`/noc/customers/${customerId}/registrations/pending/`)
      return res.data
    }
    const res = await api.get<PendingRegistrationsResponse>('/noc/registrations/pending/')
    return res.data
  },

  approveRegistration: async (
    customerId: number,
    registrationId: number,
    adminUsername?: string
  ): Promise<any> => {
    const res = await api.post(
      `/noc/customers/${customerId}/registrations/${registrationId}/approve/`,
      adminUsername ? { admin_username: adminUsername } : {}
    )
    return res.data
  },

  rejectRegistration: async (
    customerId: number,
    registrationId: number,
    reason: string,
    adminUsername?: string
  ): Promise<any> => {
    const res = await api.post(
      `/noc/customers/${customerId}/registrations/${registrationId}/reject/`,
      { reason, ...(adminUsername ? { admin_username: adminUsername } : {}) }
    )
    return res.data
  },

  getNextProposalInstanceId: async (): Promise<{ next_instance_id: number }> => {
    const res = await api.get<{ next_instance_id: number }>('/noc/router-proposals/next-instance-id/')
    return res.data
  },

  listRouterProposals: async (baId?: number): Promise<RouterProposal[]> => {
    const res = await api.get<RouterProposal[]>('/noc/router-proposals/', {
      params: baId ? { ba_id: baId } : undefined,
    })
    return res.data
  },

  getRouterProposal: async (id: number): Promise<RouterProposal> => {
    const res = await api.get<RouterProposal>(`/noc/router-proposals/${id}/`)
    return res.data
  },

  createRouterProposal: async (data: RouterProposalCreate): Promise<RouterProposal> => {
    const res = await api.post<RouterProposal>('/noc/router-proposals/', data)
    return res.data
  },

  updateRouterProposal: async (
    id: number,
    data: RouterProposalUpdate
  ): Promise<RouterProposal> => {
    const res = await api.put<RouterProposal>(`/noc/router-proposals/${id}/`, data)
    return res.data
  },

  submitRouterProposal: async (id: number): Promise<RouterProposal> => {
    const res = await api.post<RouterProposal>(`/noc/router-proposals/${id}/submit/`)
    return res.data
  },

  approveRouterProposal: async (
    id: number,
    data: RouterProposalApprove
  ): Promise<RouterProposal> => {
    const res = await api.post<RouterProposal>(`/noc/router-proposals/${id}/approve/`, data)
    return res.data
  },

  rejectRouterProposal: async (
    id: number,
    data: RouterProposalReject
  ): Promise<RouterProposal> => {
    const res = await api.post<RouterProposal>(`/noc/router-proposals/${id}/reject/`, data)
    return res.data
  },

  returnRouterProposal: async (
    id: number,
    data: RouterProposalReturn
  ): Promise<RouterProposal> => {
    const res = await api.post<RouterProposal>(`/noc/router-proposals/${id}/return/`, data)
    return res.data
  },

  // ── Change Requests ──────────────────────────────────────────────────

  listChangeRequests: async (): Promise<ChangeRequest[]> => {
    const res = await api.get<ChangeRequest[]>('/noc/change-requests/')
    return res.data
  },

  approveChangeRequest: async (reqId: number): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(`/noc/change-requests/${reqId}/approve/`)
    return res.data
  },

  rejectChangeRequest: async (
    reqId: number,
    data: ChangeRequestReview
  ): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(`/noc/change-requests/${reqId}/reject/`, data)
    return res.data
  },

  returnChangeRequest: async (
    reqId: number,
    data: ChangeRequestReview
  ): Promise<ChangeRequest> => {
    const res = await api.post<ChangeRequest>(`/noc/change-requests/${reqId}/return/`, data)
    return res.data
  },

  // ── Fault Localization & Interface Provisioning ─────────────────────

  faultCheck: async (customerId: number): Promise<any> => {
    const res = await api.get(`/noc/customers/${customerId}/fault-check/`)
    return res.data
  },

  setupInterface: async (
    instanceId: number,
    payload: { interface: string; svlan: number; cvlan: number; ip_cidr: string }
  ): Promise<any> => {
    const res = await api.post(`/noc/instances/${instanceId}/interface-setup/`, payload)
    return res.data
  },

  // ── IP Calculator & Network Provisioning ───────────────────────────

  calculateIpPool: async (payload: IpCalculatorRequest): Promise<IpCalculatorResponse> => {
    const res = await api.post<IpCalculatorResponse>('/noc/ip-calculator/', payload)
    return res.data
  },

  getNextSubnet: async (
    instanceId: number,
    params?: { concurrent_users?: number; total_users?: number; buffer_pct?: number }
  ): Promise<IpCalculatorResponse & { supernet_cidr: string; instance_id: number }> => {
    const res = await api.get<IpCalculatorResponse & { supernet_cidr: string; instance_id: number }>(
      `/noc/instances/${instanceId}/next-subnet/`,
      { params }
    )
    return res.data
  },

  provisionCustomerNetwork: async (
    customerId: number,
    payload: NetworkProvisionPayload
  ): Promise<NetworkProvisionResponse> => {
    const res = await api.post<NetworkProvisionResponse>(
      `/noc/customers/${customerId}/provision-network/`,
      payload,
      { timeout: 120_000 }
    )
    return res.data
  },

  setupDhcp: async (instanceId: number, payload: DhcpSetupPayload): Promise<any> => {
    const res = await api.post(`/noc/instances/${instanceId}/dhcp-setup/`, payload)
    return res.data
  },

  setupDns: async (instanceId: number, payload: DnsSetupPayload): Promise<any> => {
    const res = await api.post(`/noc/instances/${instanceId}/dns-setup/`, payload)
    return res.data
  },

  listIpPools: async (instanceId?: number): Promise<IpSubnetPool[]> => {
    const res = await api.get<IpSubnetPool[]>('/noc/ip-pools/', { params: { instance_id: instanceId } })
    return res.data
  },

  createIpPool: async (payload: IpSubnetPoolCreate): Promise<IpSubnetPool> => {
    const res = await api.post<IpSubnetPool>('/noc/ip-pools/', payload)
    return res.data
  },

  deleteIpPool: async (poolId: number): Promise<void> => {
    await api.delete(`/noc/ip-pools/${poolId}/`)
  },

  getUnintegratedCustomers: async (instanceId: number): Promise<UnintegratedCustomer[]> => {
    const res = await api.get<UnintegratedCustomer[]>(`/noc/instances/${instanceId}/unintegrated-customers/`)
    return res.data
  },

  adoptCustomer: async (payload: AdoptCustomerPayload): Promise<AdoptCustomerResponse> => {
    const res = await api.post<AdoptCustomerResponse>('/noc/customers/adopt/', payload)
    return res.data
  },
}



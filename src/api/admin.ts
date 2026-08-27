import { api } from '@/lib/axios'
import type {
  CircleVlanPool,
  CircleVlanPoolCreate,
  BASvlanAllocation,
  BASvlanAllocationCreate,
} from '@/types'

export const adminApi = {
  listCircleVlanPools: async (circleId: number): Promise<CircleVlanPool[]> => {
    const res = await api.get<CircleVlanPool[]>(`/admin/circles/${circleId}/vlan-pools/`)
    return res.data
  },

  createCircleVlanPool: async (
    circleId: number,
    data: CircleVlanPoolCreate
  ): Promise<CircleVlanPool> => {
    const res = await api.post<CircleVlanPool>(`/admin/circles/${circleId}/vlan-pools/`, data)
    return res.data
  },

  deleteCircleVlanPool: async (circleId: number, poolId: number): Promise<void> => {
    await api.delete(`/admin/circles/${circleId}/vlan-pools/${poolId}/`)
  },

  listBASvlanAllocations: async (baId: number): Promise<BASvlanAllocation[]> => {
    const res = await api.get<BASvlanAllocation[]>(
      `/admin/business-areas/${baId}/svlan-allocations/`
    )
    return res.data
  },

  createBASvlanAllocation: async (
    baId: number,
    data: BASvlanAllocationCreate
  ): Promise<BASvlanAllocation> => {
    const res = await api.post<BASvlanAllocation>(
      `/admin/business-areas/${baId}/svlan-allocations/`,
      data
    )
    return res.data
  },

  deleteBASvlanAllocation: async (baId: number, allocId: number): Promise<void> => {
    await api.delete(`/admin/business-areas/${baId}/svlan-allocations/${allocId}/`)
  },
}

import { api } from '@/lib/axios'
import type {
  UserRead, UserCreate, UserUpdate,
  UserListResponse, PaginationParams,
} from '@/types'

export const usersApi = {
  list: async (params?: PaginationParams): Promise<UserListResponse> => {
    const res = await api.get<UserListResponse>('/admin/users/', { params })
    return res.data
  },

  get: async (id: number): Promise<UserRead> => {
    const res = await api.get<UserRead>(`/admin/users/${id}`)
    return res.data
  },

  create: async (data: UserCreate): Promise<UserRead> => {
    const res = await api.post<UserRead>('/admin/users/', data)
    return res.data
  },

  update: async (id: number, data: UserUpdate): Promise<UserRead> => {
    const res = await api.put<UserRead>(`/admin/users/${id}`, data)
    return res.data
  },

  deactivate: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`)
  },
}

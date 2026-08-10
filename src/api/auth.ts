import { api, setStoredToken, clearAuth } from '@/lib/axios'
import type { LoginRequest, LoginResponse, UserRead, PasswordChangeRequest, PasswordChangeResponse } from '@/types'

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/admin/login', data)
    setStoredToken(res.data.access_token, res.data.refresh_token)
    return res.data
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore stateless logout failure */
    }
    clearAuth()
  },

  getMe: async (): Promise<UserRead> => {
    const res = await api.get<UserRead>('/admin/users/me')
    return res.data
  },

  changePassword: async (data: PasswordChangeRequest): Promise<PasswordChangeResponse> => {
    const res = await api.put<PasswordChangeResponse>('/admin/users/me/password', data)
    return res.data
  },
}

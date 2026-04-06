import { api, setStoredToken, clearAuth } from '@/lib/axios'
import type { LoginRequest, LoginResponse, TokenResponse } from '@/types'

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/admin/login', data)
    setStoredToken(res.data.access_token, res.data.refresh_token)
    return res.data
  },

  logout: async (): Promise<void> => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    clearAuth()
  },

  getMe: async () => {
    const res = await api.get('/admin/users/me')
    return res.data
  },

  changePassword: async (data: {
    current_password: string
    new_password: string
    confirm_password: string
  }) => {
    const res = await api.put('/admin/users/me/password', data)
    return res.data
  },
}

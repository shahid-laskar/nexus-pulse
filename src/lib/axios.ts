/**
 * Axios instance with:
 * - Base URL from env
 * - JWT Bearer token injected from auth store
 * - 401 → clears auth and redirects to login
 * - Request retry after token refresh (retried exactly once)
 * - Error message normalization helper
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { APIError } from '@/types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
})

// ── Request interceptor: attach token ─────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401, retry once after refresh ────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Don't retry refresh endpoint itself or already-retried requests
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      const refreshToken = getStoredRefreshToken()
      if (!refreshToken) {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        })
        const newToken = data.access_token
        setStoredToken(newToken, data.refresh_token)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null)
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ── Error normalization helpers ──────────────────────────────────────
export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Record<string, unknown>
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) {
      return (data.detail as Array<{ msg?: string }>).map((err) => err.msg || JSON.stringify(err)).join(', ')
    }
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
    if (data.details && typeof data.details === 'object') {
      return Object.entries(data.details as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')
    }
    if (Array.isArray(data.errors)) {
      return (data.errors as Array<{ field?: string; message?: string }>)
        .map((e) => `${e.field ? e.field + ': ' : ''}${e.message || JSON.stringify(e)}`)
        .join(', ')
    }
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}

// ── Token helpers (localStorage) ──────────────────────────────────────
const TOKEN_KEY   = 'bsnl_admin_token'
const REFRESH_KEY = 'bsnl_admin_refresh'

export const getStoredToken       = () => localStorage.getItem(TOKEN_KEY)
export const getStoredRefreshToken = () => localStorage.getItem(REFRESH_KEY)
export const setStoredToken = (access: string, refresh: string) => {
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem('bsnl_admin_user')
}

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { getStoredToken } from '@/lib/axios'
import type { RoleName } from '@/types'

/**
 * Redirects to /login if not authenticated.
 * Optionally checks required roles and redirects to /unauthorized.
 */
export function useRequireAuth(allowedRoles?: RoleName[]) {
  const navigate   = useNavigate()
  const { isLoggedIn, roleName } = useAuthStore()
  const token = getStoredToken()

  useEffect(() => {
    if (!isLoggedIn || !token) {
      navigate('/login', { replace: true })
      return
    }
    if (allowedRoles && roleName && !allowedRoles.includes(roleName)) {
      navigate('/unauthorized', { replace: true })
    }
  }, [isLoggedIn, token, roleName, allowedRoles, navigate])
}

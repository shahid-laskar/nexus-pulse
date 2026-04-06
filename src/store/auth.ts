/**
 * Zustand auth store.
 * Persists user + role flags to localStorage so page refresh doesn't log out.
 * Never stores access token in Zustand — it lives in localStorage via axios.ts helpers.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RoleName, UserRead } from '@/types'

interface AuthState {
  user:        UserRead | null
  isLoggedIn:  boolean

  // Role flags — derived from user.profile.role.name
  // Set once on login, cleared on logout
  roleName:    RoleName | null
  isSuper:     boolean
  isCircle:    boolean
  isBA:        boolean
  isNOC:       boolean
  isEB:        boolean

  // Capabilities — used to show/hide nav items and guard routes
  canManageUsers:     boolean
  canManageCircles:   boolean
  canManageBAs:       boolean
  canManageCustomers: boolean
  canAccessNOC:       boolean
  canAccessEB:        boolean

  // Scope — for displaying "Viewing: KL Circle / TVM BA"
  scopeCircle: { id: number; name: string; code: string } | null
  scopeBA:     { id: number; name: string; code: string } | null

  setUser:   (user: UserRead) => void
  clearUser: () => void
}

const deriveFlags = (user: UserRead) => {
  const role = user.profile.role.name as RoleName
  return {
    roleName:           role,
    isSuper:            role === 'SUPER_ADMIN',
    isCircle:           role === 'CIRCLE_ADMIN',
    isBA:               role === 'BA_ADMIN',
    isNOC:              role === 'BA_NOC_ADMIN',
    isEB:               role === 'BA_EB_ADMIN',
    canManageUsers:     ['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN'].includes(role),
    canManageCircles:   role === 'SUPER_ADMIN',
    canManageBAs:       ['SUPER_ADMIN', 'CIRCLE_ADMIN'].includes(role),
    canManageCustomers: ['SUPER_ADMIN', 'CIRCLE_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'].includes(role),
    canAccessNOC:       ['SUPER_ADMIN', 'BA_NOC_ADMIN'].includes(role),
    canAccessEB:        ['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'].includes(role),
    scopeCircle:        user.profile.circle,
    scopeBA:            user.profile.business_area,
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:               null,
      isLoggedIn:         false,
      roleName:           null,
      isSuper:            false,
      isCircle:           false,
      isBA:               false,
      isNOC:              false,
      isEB:               false,
      canManageUsers:     false,
      canManageCircles:   false,
      canManageBAs:       false,
      canManageCustomers: false,
      canAccessNOC:       false,
      canAccessEB:        false,
      scopeCircle:        null,
      scopeBA:            null,

      setUser: (user) => set({ user, isLoggedIn: true, ...deriveFlags(user) }),

      clearUser: () => set({
        user:               null,
        isLoggedIn:         false,
        roleName:           null,
        isSuper:            false,
        isCircle:           false,
        isBA:               false,
        isNOC:              false,
        isEB:               false,
        canManageUsers:     false,
        canManageCircles:   false,
        canManageBAs:       false,
        canManageCustomers: false,
        canAccessNOC:       false,
        canAccessEB:        false,
        scopeCircle:        null,
        scopeBA:            null,
      }),
    }),
    {
      name: 'bsnl_admin_user',
      partialize: (state) => ({
        user:               state.user,
        isLoggedIn:         state.isLoggedIn,
        roleName:           state.roleName,
        isSuper:            state.isSuper,
        isCircle:           state.isCircle,
        isBA:               state.isBA,
        isNOC:              state.isNOC,
        isEB:               state.isEB,
        canManageUsers:     state.canManageUsers,
        canManageCircles:   state.canManageCircles,
        canManageBAs:       state.canManageBAs,
        canManageCustomers: state.canManageCustomers,
        canAccessNOC:       state.canAccessNOC,
        canAccessEB:        state.canAccessEB,
        scopeCircle:        state.scopeCircle,
        scopeBA:            state.scopeBA,
      }),
    }
  )
)

import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'
import toast from 'react-hot-toast'

interface NavItem {
  to:    string
  label: string
  icon:  string
}

export function Sidebar() {
  const navigate   = useNavigate()
  const auth       = useAuthStore()
  const {
    user, scopeCircle, scopeBA,
    canManageUsers, canManageCircles, canManageBAs,
    canManageCustomers, canAccessNOC, canAccessEB,
    isSuper,
  } = auth

  const handleLogout = async () => {
    await authApi.logout()
    auth.clearUser()
    navigate('/login', { replace: true })
    toast.success('Logged out successfully')
  }

  const initials = user
    ? `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase() || user.username[0].toUpperCase()
    : '?'

  return (
    <aside className="fixed inset-y-0 left-0 w-[240px] bg-[#0a1628] flex flex-col z-50">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="text-[#e8b400] font-bold text-xl tracking-wide">BSNL WiFi</div>
        <div className="text-white/40 text-xs mt-0.5">Admin Portal</div>
      </div>

      {/* Scope badge */}
      {(scopeCircle || scopeBA) && (
        <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06] text-xs text-white/50">
          {scopeCircle && <span className="text-white/80">{scopeCircle.name}</span>}
          {scopeBA && <> / <span className="text-white/80">{scopeBA.name}</span></>}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">

        <NavSection label="Overview">
          <NavItem to="/dashboard" icon="📊" label="Dashboard" />
        </NavSection>

        {canManageCustomers && (
          <NavSection label="Master Data">
            {canManageCircles && <NavItem to="/circles"        icon="🌐" label="Circles" />}
            {canManageBAs     && <NavItem to="/business-areas" icon="🏢" label="Business Areas" />}
          </NavSection>
        )}

        {canManageUsers && (
          <NavSection label="Users">
            <NavItem to="/users"        icon="👤" label="All Users" />
            <NavItem to="/users/create" icon="➕" label="Create User" />
          </NavSection>
        )}

        {canAccessNOC && (
          <NavSection label="NOC Operations">
            <NavItem to="/noc"          icon="📡" label="NOC Dashboard" />
            <NavItem to="/noc/sessions" icon="⚡" label="Sessions" />
          </NavSection>
        )}

        {canAccessEB && (
          <NavSection label="EB Management">
            <NavItem to="/eb"             icon="🏗️" label="EB Dashboard" />
            <NavItem to="/eb/customers"   icon="📋" label="EB Customers" />
          </NavSection>
        )}

      </nav>

      {/* User footer */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#e8b400] flex items-center justify-center text-[#0a1628] font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold truncate">
            {user?.full_name || user?.username}
          </div>
          <div className="text-[#e8b400] text-[10px] uppercase tracking-wide">
            {user?.profile.role.name.replace(/_/g, ' ')}
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Logout"
          className="text-white/30 hover:text-red-400 transition-colors text-lg"
        >
          ⏻
        </button>
      </div>
    </aside>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
        {label}
      </p>
      {children}
    </div>
  )
}

function NavItem({ to, icon, label }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-4 py-2 text-sm transition-all border-l-[3px]',
          isActive
            ? 'text-white bg-white/10 border-l-[#e8b400]'
            : 'text-white/65 border-transparent hover:text-white hover:bg-white/[0.07]'
        )
      }
    >
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </NavLink>
  )
}

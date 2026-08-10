import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'
import toast from 'react-hot-toast'
import { 
  Zap, LayoutDashboard, Globe, Building, Users, User, UserPlus, 
  Siren, Wifi, LineChart, Briefcase, ClipboardList, Settings, LogOut 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItemProps {
  to:    string
  label: string
  icon:  React.ElementType
}

export function Sidebar() {
  const navigate   = useNavigate()
  const auth       = useAuthStore()
  const {
    user, scopeCircle, scopeBA,
    canManageUsers, canManageCircles, canManageBAs,
    canManageCustomers, canAccessNOC, canAccessEB,
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
    <aside className="sticky top-0 h-screen shrink-0 w-60 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 z-50">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 shrink-0">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <Zap className="h-4 w-4" />
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-sidebar-foreground">
          BSNL <span className="font-normal text-muted-foreground">Pulse</span>
        </span>
      </div>

      {/* Scope badge */}
      {(scopeCircle || scopeBA) && (
        <div className="px-4 py-2.5 bg-sidebar-accent/50 border-b border-sidebar-border text-[11px] text-muted-foreground shrink-0 font-mono">
          {scopeCircle && <span className="text-sidebar-foreground font-medium">{scopeCircle.name}</span>}
          {scopeBA && <> / <span className="text-sidebar-foreground font-medium">{scopeBA.name}</span></>}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary">

        <NavSection label="Overview">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        </NavSection>

        {canManageCustomers && (
          <NavSection label="Master Data">
            {canManageCircles && <NavItem to="/circles"        icon={Globe} label="Circles" />}
            {canManageBAs     && <NavItem to="/business-areas" icon={Building} label="Business Areas" />}
            <NavItem to="/customers" icon={Users} label="Customers" />
          </NavSection>
        )}

        {canManageUsers && (
          <NavSection label="Users">
            <NavItem to="/users"        icon={User} label="All Users" />
            <NavItem to="/users/create" icon={UserPlus} label="Create User" />
          </NavSection>
        )}

        {canAccessNOC && (
          <NavSection label="NOC Operations">
            <NavItem to="/noc"          icon={Zap} label="NOC Dashboard" />
            <NavItem to="/noc/alerts"   icon={Siren} label="Fault Monitoring" />
            <NavItem to="/noc/sessions" icon={Wifi} label="Sessions" />
            <NavItem to="/noc/analytics" icon={LineChart} label="Analytics & Logs" />
          </NavSection>
        )}

        {canAccessEB && (
          <NavSection label="EB Management">
            <NavItem to="/eb"             icon={Briefcase} label="EB Dashboard" />
            <NavItem to="/eb/customers"   icon={ClipboardList} label="EB Customers" />
          </NavSection>
        )}

        <NavSection label="Account">
          <NavItem to="/profile" icon={Settings} label="Profile Settings" />
        </NavSection>

      </nav>

      {/* User footer */}
      <div className="p-3 shrink-0 border-t border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors">
          <NavLink to="/profile" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-[11px] shrink-0 hover:opacity-90 shadow-sm">
            {initials}
          </NavLink>
          <div className="flex-1 min-w-0">
            <NavLink to="/profile" className="text-sidebar-foreground text-[12px] font-semibold truncate block hover:underline">
              {user?.full_name || user?.username}
            </NavLink>
            <div className="text-muted-foreground text-[9.5px] uppercase tracking-wider font-mono">
              {user?.profile.role.name.replace(/_/g, ' ')}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="text-muted-foreground hover:text-critical transition-colors p-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <ul className="space-y-0.5">
        {children}
      </ul>
    </div>
  )
}

function NavItem({ to, icon: Icon, label }: NavItemProps) {
  return (
    <li>
      <NavLink
        to={to}
        end={to === '/dashboard' || to === '/eb'}
        className={({ isActive }) =>
          cn(
            "group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] transition-colors duration-100",
            isActive
              ? "bg-sidebar-accent font-medium text-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
            )}
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  )
}

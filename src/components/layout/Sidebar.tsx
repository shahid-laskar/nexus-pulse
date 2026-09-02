import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'
import toast from 'react-hot-toast'
import { 
  Zap, LayoutDashboard, Globe, Building, Users, User, UserPlus, 
  Siren, Wifi, LineChart, Briefcase, ClipboardList, Settings, LogOut, UserCheck, Router,
  ShieldCheck, ShieldAlert, Server, GitPullRequest, Activity, Layers
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
    user, isSuper, scopeCircle, scopeBA,
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
    <aside className="sticky top-0 h-screen shrink-0 w-60 flex flex-col border-r border-slate-200 bg-white transition-[width] duration-200 z-50">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-4 shrink-0 bg-white">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-white shadow-2xs">
          <Zap className="h-4 w-4" />
        </span>
        <span className="text-[13px] font-bold tracking-tight text-slate-900">
          BSNL <span className="font-normal text-slate-500">Pulse</span>
        </span>
      </div>

      {/* Scope badge */}
      {(scopeCircle || scopeBA) && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 shrink-0 font-mono">
          {scopeCircle && <span className="text-slate-800 font-semibold">{scopeCircle.name}</span>}
          {scopeBA && <> / <span className="text-slate-800 font-semibold">{scopeBA.name}</span></>}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary">

        <NavSection label="Overview">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        </NavSection>

        {canManageCustomers && (
          <NavSection label="Master Data">
            {(canManageCircles || canManageBAs) && (
              <NavItem to="/circles" icon={Globe} label="Circles & BAs" />
            )}
            {!canAccessEB && <NavItem to="/customers" icon={Users} label="Customers" />}
            {isSuper && <NavItem to="/admin/router-approvals" icon={ShieldCheck} label="Router Approvals" />}
            {isSuper && <NavItem to="/admin/ipdr" icon={ShieldAlert} label="IPDR Compliance" />}
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
            <NavItem to="/noc/operations"       icon={Activity} label="Operations" />
            <NavItem to="/noc/provisioning"     icon={Layers} label="Provisioning" />
            <NavItem to="/noc/instances"        icon={Server} label="VyOS Instances" />
            <NavItem to="/noc/router-proposals" icon={Router} label="Router Proposals" />
            <NavItem to="/noc/change-requests"  icon={GitPullRequest} label="Change Requests" />
            <NavItem to="/noc/alerts"           icon={Siren} label="Fault Monitoring" />
            <NavItem to="/noc/registrations"    icon={UserCheck} label="Registrations" />
            <NavItem to="/noc/sessions"         icon={Wifi} label="Sessions" />
            <NavItem to="/noc/analytics"        icon={LineChart} label="Analytics & Logs" />
          </NavSection>
        )}

        {canAccessEB && (
          <NavSection label="EB Management">
            <NavItem to="/eb"                 icon={Briefcase} label="EB Dashboard" />
            <NavItem to="/eb/change-requests" icon={GitPullRequest} label="Change Requests" />
            <NavItem to="/eb/customers"       icon={ClipboardList} label="EB Customers" />
          </NavSection>
        )}

        <NavSection label="Account">
          <NavItem to="/profile" icon={Settings} label="Profile Settings" />
        </NavSection>

      </nav>

      {/* User footer */}
      <div className="p-3 shrink-0 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
          <NavLink to="/profile" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[11px] shrink-0 hover:opacity-90 shadow-2xs">
            {initials}
          </NavLink>
          <div className="flex-1 min-w-0">
            <NavLink to="/profile" className="text-slate-900 text-[12px] font-semibold truncate block hover:underline">
              {user?.full_name || user?.username}
            </NavLink>
            <div className="text-slate-400 text-[9.5px] uppercase tracking-wider font-mono">
              {user?.profile.role.name.replace(/_/g, ' ')}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-md hover:bg-white"
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
      <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
            "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all duration-100",
            isActive
              ? "bg-blue-50 text-blue-700 font-semibold"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
            )}
            <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
            <span className="truncate">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  )
}

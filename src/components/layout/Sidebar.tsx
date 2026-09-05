import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { authApi } from '@/api/auth'
import toast from 'react-hot-toast'
import { ChevronsLeft, LogOut, Settings, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV, type Capability, type NavLeaf } from './nav'

export function Sidebar() {
  const navigate = useNavigate()
  const auth = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { user, scopeCircle, scopeBA } = auth

  const can = (key: Capability | Capability[]): boolean => {
    const keys = Array.isArray(key) ? key : [key]
    return keys.some((k) => (k === 'always' ? true : Boolean((auth as unknown as Record<string, boolean>)[k])))
  }

  const handleLogout = async () => {
    await authApi.logout()
    auth.clearUser()
    navigate('/login', { replace: true })
    toast.success('Signed out')
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
      user.username[0].toUpperCase()
    : '?'

  const collapsed = sidebarCollapsed

  return (
    <aside
      className={cn(
        'sticky top-0 z-50 flex h-screen shrink-0 flex-col border-r border-hairline bg-sidebar',
        'transition-[width] duration-200 ease-standard',
        collapsed ? 'w-14' : 'w-58'
      )}
    >
      {/* Brand */}
      <div className={cn('flex h-14 shrink-0 items-center gap-2.5 border-b border-hairline px-3')}>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold tracking-tight text-sidebar-foreground">
              BSNL <span className="font-normal text-muted-foreground">Pulse</span>
            </p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            title="Collapse sidebar"
            className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scope */}
      {!collapsed && (scopeCircle || scopeBA) && (
        <div className="border-b border-hairline px-3 py-2">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Operating scope
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-foreground">
            {scopeCircle?.name}
            {scopeBA && <span className="text-muted-foreground"> / {scopeBA.name}</span>}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
        {NAV.filter((g) => can(g.can)).map((group) => {
          const items = group.items.filter((i) => can(i.can))
          if (!items.length) return null
          return (
            <div key={group.label} className="mb-4 last:mb-0">
              {!collapsed && (
                <p className="px-2 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="mx-2 mb-2 h-px bg-hairline" />}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <Item key={item.to} item={item} collapsed={collapsed} />
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-hairline p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent"
            >
              <ChevronsLeft className="h-4 w-4 rotate-180" />
            </button>
            <NavLink
              to="/profile"
              className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
            >
              {initials}
            </NavLink>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-critical-soft hover:text-critical"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface-2/60 p-1.5">
            <NavLink
              to="/profile"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
            >
              {initials}
            </NavLink>
            <div className="min-w-0 flex-1">
              <NavLink to="/profile" className="block truncate text-[12px] font-medium hover:underline">
                {user?.full_name || user?.username}
              </NavLink>
              <p className="truncate font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
                {user?.profile.role.name.replace(/_/g, ' ')}
              </p>
            </div>
            <NavLink
              to="/settings"
              title="Settings"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
            </NavLink>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-critical"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function Item({ item, collapsed }: { item: NavLeaf; collapsed: boolean }) {
  const { to, icon: Icon, label, badge } = item
  return (
    <li>
      <NavLink
        to={to}
        end={to === '/dashboard' || to === '/eb'}
        title={collapsed ? label : undefined}
        className={({ isActive }) =>
          cn(
            'group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors',
            collapsed && 'justify-center px-0',
            isActive
              ? 'bg-sidebar-accent text-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground'
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-4.5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
            )}
            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
            {!collapsed && <span className="truncate">{label}</span>}
            {!collapsed && badge === 'live' && (
              <span className="ml-auto flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-healthy">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-healthy" />
                Live
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  )
}

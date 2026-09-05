import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, ChevronRight, Moon, Search, Sun, LifeBuoy } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { NAV_INDEX } from './nav'
import { Kbd } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

const TITLES: Record<string, string> = {
  users: 'Users',
  create: 'Create',
  edit: 'Edit',
  noc: 'NOC',
  eb: 'Enterprise Business',
  admin: 'Administration',
  compliance: 'Compliance',
}

function useCrumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  return parts.map((part, i) => {
    const to = '/' + parts.slice(0, i + 1).join('/')
    const known = NAV_INDEX.find((n) => n.to === to)?.label
    const label =
      known ??
      TITLES[part] ??
      (/^\d+$/.test(part) ? `#${part}` : part.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()))
    return { to, label }
  })
}

export function Topbar() {
  const crumbs = useCrumbs()
  const { setCommandOpen, theme, toggleTheme } = useUIStore()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const env = import.meta.env.VITE_APP_ENV as string | undefined

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-surface/85 px-5 backdrop-blur lg:px-7">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-[12px] md:flex">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
          Pulse
        </Link>
        {crumbs.map((c, i) => (
          <span key={c.to} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            <Link
              to={c.to}
              className={cn(
                'truncate',
                i === crumbs.length - 1
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {c.label}
            </Link>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setCommandOpen(true)}
          className="group flex h-8 items-center gap-2 rounded-lg border border-hairline bg-surface-2/70 px-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-surface-2 md:w-64"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden flex-1 text-left md:inline">Search or jump to…</span>
          <span className="hidden items-center gap-0.5 md:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        {env && env !== 'production' && (
          <span className="hidden rounded-md border border-warn/30 bg-warn-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-warn lg:inline">
            {env}
          </span>
        )}

        <span className="hidden items-center gap-1.5 rounded-lg border border-hairline bg-surface-2/70 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground lg:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-healthy" />
          {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} IST
        </span>

        <Link
          to="/noc/alerts"
          title="Alerts"
          className="relative grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-critical" />
        </Link>

        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <a
          href="https://pmwani.gov.in"
          target="_blank"
          rel="noreferrer"
          title="Help & PM-WANI registry"
          className="hidden h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground sm:grid"
        >
          <LifeBuoy className="h-4 w-4" />
        </a>
      </div>
    </header>
  )
}

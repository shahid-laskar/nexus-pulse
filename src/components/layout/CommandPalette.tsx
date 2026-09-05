import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, Moon, Sun } from 'lucide-react'
import { NAV_INDEX } from './nav'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { Kbd } from '@/components/ui/EmptyState'

export function CommandPalette() {
  const navigate = useNavigate()
  const { commandOpen, setCommandOpen, toggleTheme, theme } = useUIStore()
  const auth = useAuthStore() as unknown as Record<string, boolean>
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
      if (e.key === 'Escape') setCommandOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commandOpen, setCommandOpen])

  useEffect(() => {
    if (commandOpen) {
      setQ('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [commandOpen])

  const actions = useMemo(
    () => [
      {
        to: '__theme',
        label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        group: 'Actions',
        icon: theme === 'dark' ? Sun : Moon,
        keywords: 'theme dark light appearance',
        can: 'always' as const,
      },
    ],
    [theme]
  )

  const items = useMemo(() => {
    const all = [...NAV_INDEX.filter((i) => i.can === 'always' || auth[i.can]), ...actions]
    const needle = q.trim().toLowerCase()
    if (!needle) return all.slice(0, 12)
    return all
      .filter((i) => `${i.label} ${i.group} ${i.keywords ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 14)
  }, [q, auth, actions])

  if (!commandOpen) return null

  const run = (to: string) => {
    setCommandOpen(false)
    if (to === '__theme') toggleTheme()
    else navigate(to)
  }

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-start justify-center bg-foreground/25 p-4 pt-[12vh] backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={() => setCommandOpen(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-hairline bg-popover shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-hairline px-3.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setCursor(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setCursor((c) => Math.min(items.length - 1, c + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setCursor((c) => Math.max(0, c - 1))
              } else if (e.key === 'Enter' && items[cursor]) {
                run(items[cursor].to)
              }
            }}
            placeholder="Search pages, customers, hotspots, actions…"
            className="h-12 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <Kbd>Esc</Kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 && (
            <li className="px-3 py-8 text-center text-[12px] text-muted-foreground">No matches</li>
          )}
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <button
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => run(item.to)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px]',
                    i === cursor ? 'bg-surface-2 text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-foreground">{item.label}</span>
                  <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    {item.group}
                  </span>
                  {i === cursor && <CornerDownLeft className="h-3.5 w-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>,
    document.body
  )
}

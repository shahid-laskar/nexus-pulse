import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsLeft, Moon, Search, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { KeyHint, StatusDot } from "./primitives";
import { incidents, alerts, kpis } from "@/lib/mock-data";
import { CommandPalette } from "./command-palette";

const TIME_RANGES = ["15m", "1h", "6h", "24h", "7d"];

function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem("pulse-theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("pulse-theme", next ? "dark" : "light");
      return next;
    });
  };
  return { dark, toggle };
}

function LiveTick() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-healthy transition-opacity duration-500",
          on ? "opacity-100" : "opacity-30",
        )}
      />
      Live
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [range, setRange] = useState("1h");
  const { dark, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const openIncidents = incidents.filter((i) => i.status !== "resolved").length;
  const unacked = alerts.filter((a) => !a.acked).length;
  const badgeValue = { incidents: openIncidents, alerts: unacked, queue: kpis.provisioningQueue };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "[") setCollapsed((c) => !c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Rail */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-hairline bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-14" : "w-60",
        )}
      >
        <div className="flex h-12 items-center gap-2 border-b border-hairline px-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-3.5 w-3.5" />
          </span>
          {!collapsed && (
            <span className="text-[13px] font-semibold tracking-tight">
              Pulse <span className="font-normal text-muted-foreground">NOC</span>
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
          {NAV.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.to;
                  const count = item.badge ? badgeValue[item.badge] : 0;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] transition-colors duration-100",
                          active
                            ? "bg-sidebar-accent font-medium text-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                        )}
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && !!count && (
                          <span
                            className={cn(
                              "tnum ml-auto rounded-full px-1.5 text-[10px] font-medium",
                              item.badge === "incidents"
                                ? "bg-critical-soft text-critical"
                                : "bg-surface-2 text-muted-foreground",
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-hairline p-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
            {!collapsed && (
              <>
                <span>Collapse</span>
                <KeyHint>[</KeyHint>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-hairline bg-background/85 px-4 backdrop-blur">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-8 min-w-0 flex-1 max-w-md items-center gap-2 rounded-md border border-hairline bg-surface px-2.5 text-[12px] text-muted-foreground transition-colors hover:border-border"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Search devices, customers, IPs, incidents…</span>
            <span className="ml-auto hidden shrink-0 sm:block">
              <KeyHint>⌘K</KeyHint>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-0.5 rounded-md border border-hairline bg-surface p-0.5 lg:flex">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "tnum rounded px-2 py-1 text-[11px] transition-colors duration-100",
                    range === r
                      ? "bg-surface-2 font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <LiveTick />
            <button
              onClick={toggle}
              aria-label="Toggle colour mode"
              className="grid h-8 w-8 place-items-center rounded-md border border-hairline bg-surface text-muted-foreground transition-colors hover:text-foreground"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <div className="hidden items-center gap-2 border-l border-hairline pl-3 sm:flex">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[10px] font-medium">
                RM
              </span>
              <div className="leading-tight">
                <p className="text-[11px] font-medium">R. Mehta</p>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <StatusDot status="healthy" /> NOC Engineer
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

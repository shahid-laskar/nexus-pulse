import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/mock-data";

/* ------------------------------------------------------------ status token */

const STATUS: Record<Severity, { dot: string; text: string; bg: string; label: string }> = {
  critical: { dot: "bg-critical", text: "text-critical", bg: "bg-critical-soft", label: "Critical" },
  warn: { dot: "bg-warn", text: "text-warn", bg: "bg-warn-soft", label: "Warning" },
  healthy: { dot: "bg-healthy", text: "text-healthy", bg: "bg-healthy-soft", label: "Healthy" },
  neutral: { dot: "bg-neutral", text: "text-neutral", bg: "bg-neutral-soft", label: "Info" },
};

export function StatusDot({ status, pulse }: { status: Severity; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden>
      {pulse && status === "critical" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-critical opacity-60" />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", STATUS[status].dot)} />
    </span>
  );
}

export function StatusBadge({
  status,
  children,
  hatched,
}: {
  status: Severity;
  children?: ReactNode;
  hatched?: boolean;
}) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        s.bg,
        s.text,
        hatched && "hatch",
      )}
    >
      <StatusDot status={status} />
      {children ?? s.label}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- card */

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[10px] border border-hairline bg-surface transition-colors duration-150 hover:border-border",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------- stat widget */

export function Sparkline({
  data,
  status = "neutral",
  className,
}: {
  data: { v: number }[];
  status?: Severity;
  className?: string;
}) {
  const values = data.map((d) => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 26 - 1}`)
    .join(" ");
  const stroke = {
    critical: "stroke-critical",
    warn: "stroke-warn",
    healthy: "stroke-healthy",
    neutral: "stroke-primary",
  }[status];
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn("h-7 w-full", className)} aria-hidden>
      <polyline points={pts} fill="none" className={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatWidget({
  label,
  value,
  unit,
  delta,
  spark,
  status = "neutral",
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  spark?: { v: number }[];
  status?: Severity;
  note?: string;
}) {
  const deltaUp = delta?.startsWith("+");
  return (
    <div className="group min-w-0 rounded-[10px] border border-hairline bg-surface px-4 py-3 transition-colors duration-150 hover:border-border">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {delta && (
          <span
            className={cn(
              "tnum text-[11px] font-medium",
              deltaUp ? "text-healthy" : "text-muted-foreground",
            )}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="tnum text-[28px] font-semibold leading-none tracking-tight text-foreground">
          {value}
        </span>
        {unit && <span className="text-[12px] text-muted-foreground">{unit}</span>}
      </div>
      {spark && <Sparkline data={spark} status={status} className="mt-2" />}
      {note && <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}

/* -------------------------------------------------------------- page shell */

export function PageHeader({
  title,
  question,
  actions,
  children,
}: {
  title: string;
  question: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{question}</p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ empty/errors */

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-surface-2" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ misc */

export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  );
}

export function Meter({ value, status }: { value: number; status?: Severity }) {
  const s: Severity = status ?? (value > 85 ? "critical" : value > 65 ? "warn" : "healthy");
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", STATUS[s].dot)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="tnum w-8 text-right text-[11px] text-muted-foreground">{value}%</span>
    </div>
  );
}

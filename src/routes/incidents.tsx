import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, Pill, StatusBadge, StatusDot } from "@/components/pulse/primitives";
import { ago, fmt, incidents, type Incident } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/incidents")({
  head: () => ({
    meta: [
      { title: "Incidents — Pulse NOC" },
      { name: "description", content: "Detect, classify, acknowledge, escalate and resolve network incidents with a single unified timeline." },
      { property: "og:title", content: "Incidents — Pulse NOC" },
      { property: "og:description", content: "Severity ranked by blast radius, with correlated alerts and an auto-drafted postmortem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentsPage,
});

const TIMELINE = [
  { t: "02:31:04", who: "system", text: "BGP session with AS64512 flapped (peer reset)", kind: "signal" },
  { t: "02:31:40", who: "system", text: "Packet loss on transit link crossed 1% — ALT-8412 fired", kind: "alert" },
  { t: "02:33:12", who: "system", text: "5 further alerts correlated into this incident (same device + 4 min window)", kind: "signal" },
  { t: "02:34:00", who: "system", text: "Severity proposed CRITICAL — ~4,120 subscribers in blast radius", kind: "signal" },
  { t: "02:35:22", who: "R. Mehta", text: "Acknowledged. Failing traffic over to secondary transit.", kind: "human" },
  { t: "02:36:05", who: "system", text: "Runbook RB-04 “Transit failover” matched — dry run available", kind: "auto" },
];

function IncidentDrawer({ incident, onClose }: { incident: Incident | null; onClose: () => void }) {
  return (
    <Sheet open={!!incident} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[720px]">
        {incident && (
          <>
            <SheetHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">{incident.id}</span>
                <StatusBadge status={incident.severity} />
                <Pill>{incident.status}</Pill>
              </div>
              <SheetTitle className="text-[16px] leading-snug">{incident.title}</SheetTitle>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-8">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Blast radius", `${fmt.format(incident.subscribersAffected)} subs`],
                  ["Zone", incident.zone],
                  ["Device", incident.device],
                  ["Age", ago(incident.ageMin)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md border border-hairline bg-surface-2 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                    <p className="tnum mt-0.5 truncate text-[12.5px] font-medium">{v}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                  Generated summary
                </p>
                <p className="mt-1 text-[12.5px]">{incident.summary}</p>
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  Most likely cause: {incident.cause}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-[12px] font-semibold">Timeline</h3>
                <ol className="space-y-0">
                  {TIMELINE.map((e, i) => (
                    <li key={i} className="relative flex gap-3 pb-4 pl-1">
                      <span className="absolute left-[3.9rem] top-2 h-full w-px bg-hairline last:hidden" />
                      <span className="tnum w-14 shrink-0 pt-0.5 text-right font-mono text-[10.5px] text-muted-foreground">
                        {e.t}
                      </span>
                      <span
                        className={cn(
                          "relative z-10 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          e.kind === "human" ? "bg-primary" : e.kind === "alert" ? "bg-critical" : "bg-neutral",
                        )}
                      />
                      <p className="min-w-0 flex-1 text-[12.5px]">
                        <span className="font-medium">{e.who}</span>{" "}
                        <span className="text-muted-foreground">{e.text}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toast.success(`${incident.id} acknowledged`)}
                  className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => toast.info("Runbook RB-04 dry run started — no changes applied")}
                  className="rounded-md border border-hairline px-3 py-1.5 text-[12px]"
                >
                  Dry-run runbook RB-04
                </button>
                <button
                  onClick={() => toast.info("Escalated to on-call tier 2")}
                  className="rounded-md border border-hairline px-3 py-1.5 text-[12px]"
                >
                  Escalate
                </button>
                <button
                  onClick={() => toast.success("Postmortem drafted from timeline")}
                  className="rounded-md border border-hairline px-3 py-1.5 text-[12px]"
                >
                  Draft postmortem
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function IncidentsPage() {
  const [open, setOpen] = useState<Incident | null>(null);
  const columns: { key: string; label: string }[] = [
    { key: "triggered", label: "Triggered" },
    { key: "acknowledged", label: "Acknowledged" },
    { key: "mitigating", label: "Mitigating" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Incidents" question="What is broken, who owns it, and how big is it?" />
      <div className="grid gap-3 lg:grid-cols-4">
        {columns.map((col) => {
          const items = incidents.filter((i) => i.status === col.key);
          return (
            <Panel
              key={col.key}
              title={col.label}
              description={`${items.length} incident${items.length === 1 ? "" : "s"}`}
              bodyClassName="p-2 space-y-2"
            >
              {items.length === 0 && (
                <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
                  Nothing here — good.
                </p>
              )}
              {items.map((i) => (
                <button
                  key={i.id}
                  onClick={() => setOpen(i)}
                  className="w-full rounded-md border border-hairline bg-surface p-3 text-left transition-colors duration-100 hover:border-border hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={i.severity} pulse={i.status === "triggered"} />
                    <span className="font-mono text-[10.5px] text-muted-foreground">{i.id}</span>
                    <span className="tnum ml-auto text-[10.5px] text-muted-foreground">{ago(i.ageMin)}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] font-medium">{i.title}</p>
                  <p className="tnum mt-1.5 text-[11px] text-muted-foreground">
                    ~{fmt.format(i.subscribersAffected)} subs · {i.alertCount} alerts
                  </p>
                  {i.owner && (
                    <p className="mt-1.5">
                      <Pill>{i.owner}</Pill>
                    </p>
                  )}
                </button>
              ))}
            </Panel>
          );
        })}
      </div>
      <IncidentDrawer incident={open} onClose={() => setOpen(null)} />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Pill, StatusBadge } from "@/components/pulse/primitives";
import { toast } from "sonner";

const PROFILES = [
  { id: 1, name: "tier-100", ceil: "100mbit", rate: "80mbit", attached: 412, drops: 0.1 },
  { id: 2, name: "tier-250", ceil: "250mbit", rate: "200mbit", attached: 268, drops: 0.3 },
  { id: 3, name: "tier-500", ceil: "500mbit", rate: "420mbit", attached: 141, drops: 1.9 },
  { id: 4, name: "tier-1g", ceil: "1gbit", rate: "900mbit", attached: 63, drops: 0.4 },
  { id: 5, name: "burst-2g", ceil: "2gbit", rate: "1200mbit", attached: 12, drops: 0.0 },
];

export const Route = createFileRoute("/qos")({
  head: () => ({
    meta: [
      { title: "QoS & Bandwidth — Pulse NOC" },
      { name: "description", content: "Bandwidth profile library, per-IP QoS attachments and the live HTB / fq_codel traffic-control tree." },
      { property: "og:title", content: "QoS & Bandwidth — Pulse NOC" },
      { property: "og:description", content: "Bandwidth profile library, per-IP QoS attachments and the live HTB / fq_codel traffic-control tree." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [ceiling, setCeiling] = useState("1gbit");
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="QoS & Bandwidth" question="Is this customer shaped the way we sold it?" />
      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <Panel title="Bandwidth profiles" description="Attached classes across all instances" bodyClassName="p-0">
          <ul className="divide-y divide-hairline">
            {PROFILES.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="font-mono text-[12.5px] font-medium">{p.name}</span>
                <Pill>ceil {p.ceil}</Pill>
                <Pill>rate {p.rate}</Pill>
                <span className="tnum ml-auto text-[11.5px] text-muted-foreground">{p.attached} IPs</span>
                <StatusBadge status={p.drops > 1 ? "warn" : "healthy"}>{p.drops}% drops</StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="TC tree — vyos-nor-07 / Redwood Estates" description="HTB root with fq_codel leaves">
          <div className="space-y-2 font-mono text-[11.5px]">
            <div className="rounded-md border border-hairline bg-surface-2 p-2">
              <p>htb 1: root — ceil {ceiling}</p>
              <div className="mt-2 space-y-1.5 pl-4">
                {[["1:10 business", 62], ["1:20 residential", 88], ["1:30 guest", 24]].map(([label, pct]) => (
                  <div key={String(label)} className="flex items-center gap-2">
                    <span className="w-40 truncate">{label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                      <div className={Number(pct) > 85 ? "h-full bg-warn" : "h-full bg-primary"} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="tnum w-10 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <label htmlFor="ceil" className="font-sans text-[12px] text-muted-foreground">Root ceiling</label>
              <input id="ceil" value={ceiling} onChange={(e) => setCeiling(e.target.value)} className="h-8 w-32 rounded-md border border-hairline bg-surface px-2 outline-none focus:border-primary" />
              <button onClick={() => toast.success(`TC root ceiling set to ${ceiling}`)} className="rounded-md bg-primary px-3 py-1.5 font-sans text-[12px] font-medium text-primary-foreground">Apply</button>
            </div>
            <p className="font-sans text-[11px] text-muted-foreground">Applies immediately and is written to the audit trail. Unit-aware: 500mbit, 1gbit, 10gbit.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

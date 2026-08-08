import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Pill } from "@/components/pulse/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/handover")({
  head: () => ({
    meta: [
      { title: "Shift handover — Pulse NOC" },
      { name: "description", content: "An auto-drafted summary of the shift: incidents, changes and watch items for the next crew." },
      { property: "og:title", content: "Shift handover — Pulse NOC" },
      { property: "og:description", content: "An auto-drafted summary of the shift: incidents, changes and watch items for the next crew." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-[1680px] space-y-3">
      <PageHeader title="Shift handover" question="What does the next shift need to know?"
        actions={<button onClick={() => toast.success("Handover published to #noc-shift")} className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground">Publish</button>} />
      <Panel title="Draft — 22:00 to 06:00" description="Generated from the timeline, editable before publishing">
        <ul className="space-y-2 text-[12.5px]">
          <li><Pill>open</Pill> <span className="font-mono">INC-2291</span> upstream transit degradation — ~4,120 subscribers, unowned, failover not yet applied.</li>
          <li><Pill>open</Pill> <span className="font-mono">INC-2290</span> OLT PON tree down in Zone West — field team at splice point SP-114, ETA 04:00.</li>
          <li><Pill>watch</Pill> Conntrack on <span className="font-mono">nas-eas-22</span> at 86% — one customer generating ~180k UDP flows/min.</li>
          <li><Pill>changed</Pill> TC root ceiling raised to 10gbit on <span className="font-mono">vyos-nor-07</span> at 02:12 — monitor drop rate.</li>
          <li><Pill>blocked</Pill> 3 provisioning jobs failing at <span className="font-mono">initialize_nftables</span> due to slug collision.</li>
        </ul>
      </Panel>
      <Panel title="Shift metrics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12.5px]">
          {[["Incidents opened", "5"], ["Median ack", "3m 12s"], ["MTTR", "48m"], ["Destructive actions", "2"]].map(([k, v]) => (
            <div key={k} className="rounded-md border border-hairline bg-surface-2 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="tnum mt-0.5 text-[16px] font-semibold">{v}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

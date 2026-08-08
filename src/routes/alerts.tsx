import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/pulse/data-table";
import { PageHeader, Pill, StatusBadge } from "@/components/pulse/primitives";
import { alerts, ago, type AlertRow } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Pulse NOC" },
      { name: "description", content: "Every firing signal, grouped by rule with dedup counts and one-click incident correlation." },
      { property: "og:title", content: "Alerts — Pulse NOC" },
      { property: "og:description", content: "Every firing signal, grouped by rule with dedup counts and one-click incident correlation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Alerts" question="Which signals are firing, and are they already grouped?" />
      <DataTable<AlertRow>
        rows={alerts}
        getId={(r) => r.id}
        selectable
        liveHint="Live — new alerts appear as a pill, rows never reorder under your cursor"
        searchPlaceholder="Filter alerts — try severity:critical rule:conntrack"
        bulkActions={(sel, clear) => (
          <>
            <button onClick={() => { toast.success(`${sel.length} alerts acknowledged`); clear(); }} className="rounded-md border border-hairline px-2 py-1 text-[12px] hover:bg-accent">Acknowledge</button>
            <button onClick={() => { toast.info(`Grouped ${sel.length} alerts into a new incident`); clear(); }} className="rounded-md border border-hairline px-2 py-1 text-[12px] hover:bg-accent">Create incident</button>
          </>
        )}
        columns={[
          { key: "sev", header: "Severity", render: (r) => <StatusBadge status={r.severity} /> },
          { key: "rule", header: "Rule", render: (r) => <span className="font-medium">{r.rule}</span> },
          { key: "entity", header: "Entity", render: (r) => <span className="font-mono text-[11.5px]">{r.entity}</span> },
          { key: "zone", header: "Zone", render: (r) => <span className="text-muted-foreground">{r.zone}</span> },
          { key: "val", header: "Value", align: "right", render: (r) => <span className="tnum">{r.value} <span className="text-muted-foreground">/ {r.threshold}</span></span> },
          { key: "count", header: "Fires", align: "right", render: (r) => <span className="tnum">{r.count}</span> },
          { key: "age", header: "Age", align: "right", render: (r) => <span className="tnum text-muted-foreground">{ago(r.ageMin)}</span> },
          { key: "inc", header: "Incident", render: (r) => (r.incidentId ? <Pill>{r.incidentId}</Pill> : <span className="text-muted-foreground">—</span>) },
          { key: "ack", header: "State", render: (r) => (r.acked ? <span className="text-muted-foreground">acked</span> : <span className="text-critical">unacked</span>) },
        ]}
      />
    </div>
  );
}

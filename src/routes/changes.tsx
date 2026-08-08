import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/pulse/primitives";
import { DataTable } from "@/components/pulse/data-table";
import { activity, ago, type ActivityItem } from "@/lib/mock-data";

export const Route = createFileRoute("/changes")({
  head: () => ({
    meta: [
      { title: "Change log — Pulse NOC" },
      { name: "description", content: "Every mutation across the network in one stream — the fastest answer to what changed before it broke." },
      { property: "og:title", content: "Change log — Pulse NOC" },
      { property: "og:description", content: "Every mutation across the network in one stream — the fastest answer to what changed before it broke." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Change log" question="What changed just before it broke?" />
      <DataTable<ActivityItem>
        rows={activity}
        getId={(r) => r.id}
        searchPlaceholder="Filter changes — try actor:R. Mehta kind:destructive"
        columns={[
          { key: "when", header: "When", render: (r) => <span className="tnum text-muted-foreground">{ago(r.agoMin)} ago</span> },
          { key: "actor", header: "Actor", render: (r) => <span className="font-medium">{r.actor}</span> },
          { key: "action", header: "Action", render: (r) => r.action },
          { key: "target", header: "Target", render: (r) => <span className="font-mono text-[11.5px]">{r.target}</span> },
          { key: "kind", header: "Kind", render: (r) => <span className={r.kind === "destructive" ? "text-critical" : "text-muted-foreground"}>{r.kind}</span> },
        ]}
      />
    </div>
  );
}

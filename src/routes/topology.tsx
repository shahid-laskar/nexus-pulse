import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, StatusBadge } from "@/components/pulse/primitives";
const HOPS = [
  { n: "CPE / Redwood Estates", ms: 0.4, s: "healthy" as const },
  { n: "olt-wes-19", ms: 1.2, s: "critical" as const },
  { n: "nas-wes-08", ms: 2.1, s: "healthy" as const },
  { n: "vyos-cor-03", ms: 3.4, s: "warn" as const },
  { n: "IX-1 upstream (AS64512)", ms: 11.8, s: "critical" as const },
];

export const Route = createFileRoute("/topology")({
  head: () => ({
    meta: [
      { title: "Topology — Pulse NOC" },
      { name: "description", content: "Logical path from customer through NAS and core to upstream, with per-hop latency and blast radius shading." },
      { property: "og:title", content: "Topology — Pulse NOC" },
      { property: "og:description", content: "Logical path from customer through NAS and core to upstream, with per-hop latency and blast radius shading." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Topology" question="How does traffic reach this customer, and what breaks if a node dies?" />
      <Panel title="Path visualisation" description="Redwood Estates → upstream · hop latency and loss">
        <ol className="space-y-0">
          {HOPS.map((h, i) => (
            <li key={h.n} className="relative flex items-center gap-3 pb-5 last:pb-0">
              {i < HOPS.length - 1 && <span className="absolute left-[7px] top-5 h-full w-px bg-hairline" />}
              <span className="relative z-10 grid h-4 w-4 place-items-center rounded-full border border-hairline bg-surface">
                <span className={h.s === "critical" ? "h-2 w-2 rounded-full bg-critical" : h.s === "warn" ? "h-2 w-2 rounded-full bg-warn" : "h-2 w-2 rounded-full bg-healthy"} />
              </span>
              <span className="font-mono text-[12.5px]">{h.n}</span>
              <StatusBadge status={h.s} />
              <span className="tnum ml-auto text-[12px] text-muted-foreground">{h.ms} ms</span>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel className="mt-3" title="Blast radius explorer" description="Select a node to see impacted customers before you act">
        <p className="text-[12.5px] text-muted-foreground">Taking <span className="font-mono text-foreground">olt-wes-19</span> offline would affect <span className="tnum font-medium text-foreground">812 subscribers</span> across <span className="tnum font-medium text-foreground">6 customers</span>, none of whom have a redundant path.</p>
      </Panel>
    </div>
  );
}

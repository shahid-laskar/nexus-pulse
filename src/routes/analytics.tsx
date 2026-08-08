import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, StatWidget } from "@/components/pulse/primitives";
import { trafficSeries, sparkline } from "@/lib/mock-data";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Traffic analytics — Pulse NOC" },
      { name: "description", content: "Capacity trends, peak utilisation and projected saturation per link." },
      { property: "og:title", content: "Traffic analytics — Pulse NOC" },
      { property: "og:description", content: "Capacity trends, peak utilisation and projected saturation per link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Traffic analytics" question="How is capacity trending, and when do we run out?" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatWidget label="Peak downstream" value="812" unit="Gbps" delta="+6.1%" spark={sparkline(71)} />
        <StatWidget label="95th percentile" value="704" unit="Gbps" delta="+4.4%" spark={sparkline(72)} />
        <StatWidget label="Busiest link" value="78%" delta="+11%" status="warn" spark={sparkline(73)} note="MTR-CORE ⇄ IX-1" />
        <StatWidget label="Saturation ETA" value="11" unit="weeks" status="warn" spark={sparkline(74)} note="at current growth rate" />
      </div>
      <Panel className="mt-3" title="24-hour profile" description="Downstream with yesterday as a ghost line">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficSeries} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} interval={11} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={44} />
              <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="baseline" stroke="var(--color-muted-foreground)" strokeDasharray="3 3" strokeWidth={1} fill="none" />
              <Area type="monotone" dataKey="down" stroke="var(--color-chart-1)" strokeWidth={1.6} fill="url(#a)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CircleCheck,
  Plus,
  Siren,
  Zap,
} from "lucide-react";
import {
  Panel,
  PageHeader,
  StatWidget,
  StatusBadge,
  StatusDot,
  Pill,
  KeyHint,
} from "@/components/pulse/primitives";
import {
  activity,
  ago,
  alerts,
  fmt,
  heatmap,
  incidents,
  kpis,
  sparkline,
  trafficSeries,
  zoneHealth,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — ISP Network Operations Center" },
      {
        name: "description",
        content:
          "Pulse NOC prototype: real-time network health, incident triage, subscriber provisioning and QoS control for a modern ISP.",
      },
      { property: "og:title", content: "Pulse — ISP Network Operations Center" },
      {
        property: "og:description",
        content:
          "Situational awareness in seconds: attention stream, zone health, live traffic and instance heatmap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Verdict() {
  const open = incidents.filter((i) => i.status !== "resolved");
  const crit = open.filter((i) => i.severity === "critical").length;
  const status = crit ? "critical" : open.length ? "warn" : "healthy";
  const sentence = crit
    ? `${crit} critical incident${crit > 1 ? "s" : ""} in progress — ${fmt.format(
        open.reduce((a, i) => a + i.subscribersAffected, 0),
      )} subscribers affected`
    : "Network nominal — no critical incidents";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-hairline bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full",
            status === "critical" ? "bg-critical-soft" : "bg-healthy-soft",
          )}
        >
          {status === "critical" ? (
            <Siren className="h-4 w-4 text-critical" />
          ) : (
            <CircleCheck className="h-4 w-4 text-healthy" />
          )}
        </span>
        <div>
          <p className="text-[15px] font-semibold tracking-tight">{sentence}</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {alerts.filter((a) => !a.acked).length} unacknowledged alerts ·{" "}
            {kpis.provisioningQueue} provisioning jobs in flight · last evaluated 4s ago
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => toast.success("Health sweep queued across 12 VyOS instances")}
          className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-[12px] transition-colors hover:bg-accent"
        >
          Run health check
        </button>
        <Link
          to="/provisioning"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Onboard customer
        </Link>
      </div>
    </div>
  );
}

function AttentionStream() {
  const [acked, setAcked] = useState<string[]>([]);
  const open = incidents.filter((i) => i.status !== "resolved");

  return (
    <Panel
      title="Attention stream"
      description="Incidents and unacked alerts, ranked by severity then blast radius"
      actions={
        <Link
          to="/incidents"
          className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          All incidents <ArrowUpRight className="h-3 w-3" />
        </Link>
      }
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-hairline">
        {open.map((i) => {
          const isAcked = acked.includes(i.id) || i.status !== "triggered";
          return (
            <li
              key={i.id}
              className="group flex items-start gap-3 px-4 py-3 transition-colors duration-100 hover:bg-accent/40"
            >
              <StatusDot status={i.severity} pulse />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{i.id}</span>
                  <Link
                    to="/incidents"
                    className="truncate text-[13px] font-medium hover:underline"
                  >
                    {i.title}
                  </Link>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                  <span className="tnum font-medium text-foreground">
                    ~{fmt.format(i.subscribersAffected)} subscribers
                  </span>
                  <span>{i.zone}</span>
                  <span className="font-mono">{i.device}</span>
                  <span>{ago(i.ageMin)} old</span>
                  <span>{i.alertCount} alerts grouped</span>
                  {i.owner && <Pill>{i.owner}</Pill>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-100 group-hover:opacity-100 focus-within:opacity-100">
                {!isAcked ? (
                  <button
                    onClick={() => {
                      setAcked((a) => [...a, i.id]);
                      toast.success(`${i.id} acknowledged`, {
                        description: "Ownership assigned to R. Mehta · response clock started",
                      });
                    }}
                    className="rounded-md border border-hairline bg-surface px-2 py-1 text-[11.5px] transition-colors hover:bg-accent"
                  >
                    Ack <KeyHint>e</KeyHint>
                  </button>
                ) : (
                  <StatusBadge status="neutral">Acked</StatusBadge>
                )}
                <button
                  onClick={() => toast.info(`${i.id} snoozed for 30 minutes`)}
                  className="rounded-md border border-hairline bg-surface px-2 py-1 text-[11.5px] transition-colors hover:bg-accent"
                >
                  Snooze
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function ZoneStrip() {
  return (
    <Panel title="Regional health" description="Zones ranked by subscribers at risk" bodyClassName="p-0">
      <ul className="divide-y divide-hairline">
        {[...zoneHealth]
          .sort((a, b) => b.critical - a.critical || b.warn - a.warn)
          .map((z) => (
            <li key={z.zone} className="px-4 py-3 transition-colors hover:bg-accent/40">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[12.5px] font-medium">
                  <StatusDot status={z.status} />
                  {z.zone}
                </span>
                <span className="tnum text-[11.5px] text-muted-foreground">
                  {fmt.format(z.online)} / {fmt.format(z.subscribers)} online
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700",
                    z.status === "critical" ? "bg-critical" : z.status === "warn" ? "bg-warn" : "bg-healthy",
                  )}
                  style={{ width: `${(z.online / z.subscribers) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{z.devices} devices</span>
                {z.critical > 0 && <span className="text-critical">{z.critical} critical</span>}
                {z.warn > 0 && <span className="text-warn">{z.warn} warning</span>}
                <span className="ml-auto tnum">{z.utilisation}% util</span>
              </div>
            </li>
          ))}
      </ul>
    </Panel>
  );
}

function TrafficPanel() {
  return (
    <Panel
      title="Aggregate traffic"
      description="Downstream / upstream across all instances · ghost line is yesterday"
      actions={<Pill>Gbps</Pill>}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trafficSeries} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="down" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval={11}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-hairline)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <ReferenceLine
              x="02:30"
              stroke="var(--color-critical)"
              strokeDasharray="3 3"
              label={{ value: "INC-2291", fontSize: 10, fill: "var(--color-critical)", position: "top" }}
            />
            <Area
              type="monotone"
              dataKey="baseline"
              stroke="var(--color-muted-foreground)"
              strokeDasharray="3 3"
              strokeWidth={1}
              fill="none"
            />
            <Area
              type="monotone"
              dataKey="down"
              stroke="var(--color-chart-1)"
              strokeWidth={1.6}
              fill="url(#down)"
            />
            <Area
              type="monotone"
              dataKey="up"
              stroke="var(--color-chart-2)"
              strokeWidth={1.4}
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function Heatmap() {
  const color = (v: number) =>
    v > 75
      ? "bg-critical"
      : v > 55
        ? "bg-warn"
        : v > 32
          ? "bg-primary/45"
          : v > 15
            ? "bg-primary/20"
            : "bg-surface-2";
  return (
    <Panel
      title="Instance health"
      description="Worst-of CPU / load / uptime deviation · 5-minute buckets, last 3 hours"
    >
      <div className="space-y-1">
        {heatmap.map((row) => (
          <div key={row.device} className="flex items-center gap-2">
            <span className="w-28 shrink-0 truncate font-mono text-[10.5px] text-muted-foreground">
              {row.device}
            </span>
            <div className="flex flex-1 gap-[2px]">
              {row.cells.map((c, i) => (
                <span
                  key={i}
                  title={`${row.device} · bucket ${i + 1} · deviation ${c}`}
                  className={cn(
                    "h-4 flex-1 rounded-[2px] transition-transform duration-100 hover:scale-y-125",
                    color(c),
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActivityFeed() {
  return (
    <Panel
      title="Recent activity"
      description="Every mutation, newest first"
      actions={
        <Link to="/changes" className="text-[11.5px] text-muted-foreground hover:text-foreground">
          Change log
        </Link>
      }
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-hairline">
        {activity.map((a) => (
          <li key={a.id} className="flex items-start gap-2.5 px-4 py-2.5 text-[12px]">
            <span
              className={cn(
                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                a.kind === "destructive"
                  ? "bg-critical"
                  : a.kind === "incident"
                    ? "bg-warn"
                    : a.kind === "provision"
                      ? "bg-healthy"
                      : "bg-neutral",
              )}
            />
            <p className="min-w-0 flex-1 text-muted-foreground">
              <span className="font-medium text-foreground">{a.actor}</span> {a.action}{" "}
              <span className="text-foreground">{a.target}</span>
            </p>
            <span className="tnum shrink-0 text-[11px] text-muted-foreground">{ago(a.agoMin)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Dashboard() {
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader
        title="Pulse"
        question="What needs my attention right now?"
        actions={
          <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex">
            Quick actions <KeyHint>.</KeyHint> · Palette <KeyHint>⌘K</KeyHint>
          </span>
        }
      />

      <Verdict />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatWidget
          label="Subscribers online"
          value={fmt.format(kpis.subscribersOnline)}
          delta="-1.4%"
          spark={sparkline(11)}
          status="warn"
          note={`of ${fmt.format(kpis.subscribersTotal)} provisioned`}
        />
        <StatWidget
          label="Throughput ↓"
          value={String(kpis.throughputDown)}
          unit="Gbps"
          delta="+3.2%"
          spark={sparkline(22)}
          note={`↑ ${kpis.throughputUp} Gbps upstream`}
        />
        <StatWidget
          label="Backbone peak"
          value={`${kpis.backbonePeak}%`}
          delta="+11%"
          spark={sparkline(33)}
          status="warn"
          note={kpis.backbonePeakLink}
        />
        <StatWidget
          label="Session churn"
          value={fmt.format(kpis.churn5m)}
          unit="/5m"
          delta="+186%"
          spark={sparkline(44)}
          status="critical"
          note="Concentrated in Zone West"
        />
        <StatWidget
          label="Provisioning queue"
          value={String(kpis.provisioningQueue)}
          spark={sparkline(55)}
          status="healthy"
          note="3 failed at nftables step"
        />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <AttentionStream />
        <ZoneStrip />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <TrafficPanel />
        <Heatmap />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Top talkers"
          description="Highest sustained downstream over the selected range"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-hairline">
            {[
              { n: "Northgate Bank", ip: "100.72.14.9", v: 8.4, pct: 92 },
              { n: "Solstice Energy", ip: "100.81.3.22", v: 6.1, pct: 67 },
              { n: "Vertex Motors", ip: "100.66.201.4", v: 5.7, pct: 62 },
              { n: "Copperline Rail", ip: "100.90.44.18", v: 4.2, pct: 46 },
              { n: "Lumen Academy", ip: "100.74.9.101", v: 3.9, pct: 43 },
            ].map((t) => (
              <li key={t.ip} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium">{t.n}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{t.ip}</p>
                </div>
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${t.pct}%` }} />
                </div>
                <span className="tnum w-16 text-right text-[12px]">{t.v} Gbps</span>
              </li>
            ))}
          </ul>
        </Panel>
        <ActivityFeed />
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Zap className="h-3 w-3" /> Prototype data is deterministic mock data — no live network is attached.
      </p>
    </div>
  );
}

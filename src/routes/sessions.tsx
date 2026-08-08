import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/pulse/data-table";
import { PageHeader, Pill, StatusBadge } from "@/components/pulse/primitives";
import { sessions, ago, type Session } from "@/lib/mock-data";
import { toast } from "sonner";

const tone = { active: "healthy", idle: "neutral", disconnected: "critical" } as const;

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions — Pulse NOC" },
      { name: "description", content: "Live PPPoE, DHCP and captive sessions with per-IP disconnect, conntrack inspection and typed bulk flush." },
      { property: "og:title", content: "Sessions — Pulse NOC" },
      { property: "og:description", content: "Live PPPoE, DHCP and captive sessions with per-IP disconnect, conntrack inspection and typed bulk flush." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Sessions" question="Who is connected right now, and how much are they pulling?" />
      <DataTable<Session>
        rows={sessions}
        getId={(r) => r.id}
        selectable
        liveHint="Live — 220 sessions streaming, changed cells flash for 300ms"
        searchPlaceholder="Filter sessions — try type:PPPoE down>500 state:idle"
        bulkActions={(sel, clear) => (
          <>
            <button onClick={() => { toast.error(`${sel.length} sessions disconnected`); clear(); }} className="rounded-md border border-critical/50 px-2 py-1 text-[12px] text-critical hover:bg-critical-soft">Disconnect</button>
            <button onClick={() => { toast.info(`Conntrack flushed for ${sel.length} sessions`); clear(); }} className="rounded-md border border-hairline px-2 py-1 text-[12px] hover:bg-accent">Flush conntrack</button>
          </>
        )}
        columns={[
          { key: "st", header: "State", render: (r) => <StatusBadge status={tone[r.state]}>{r.state}</StatusBadge> },
          { key: "ip", header: "IP", render: (r) => <span className="font-mono text-[12px] font-medium">{r.ip}</span> },
          { key: "u", header: "Username", render: (r) => <span className="font-mono text-[11.5px]">{r.username}</span> },
          { key: "c", header: "Customer", render: (r) => r.customer },
          { key: "t", header: "Type", render: (r) => <Pill>{r.type}</Pill> },
          { key: "d", header: "Down", align: "right", render: (r) => <span className="tnum">{r.downMbps} Mbps</span> },
          { key: "up", header: "Up", align: "right", render: (r) => <span className="tnum text-muted-foreground">{r.upMbps} Mbps</span> },
          { key: "p", header: "Profile", render: (r) => <span className="font-mono text-[11.5px] text-muted-foreground">{r.profile}</span> },
          { key: "ct", header: "Conntrack", align: "right", render: (r) => <span className="tnum text-muted-foreground">{r.conntrack}</span> },
          { key: "dur", header: "Duration", align: "right", render: (r) => <span className="tnum text-muted-foreground">{ago(r.durationMin)}</span> },
        ]}
      />
    </div>
  );
}

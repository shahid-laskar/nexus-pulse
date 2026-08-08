import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, StatusBadge } from "@/components/pulse/primitives";
import { zoneHealth, fmt } from "@/lib/mock-data";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Live map — Pulse NOC" },
      { name: "description", content: "Geographic view of zones, with incident pulse rings and a weather overlay for outage correlation." },
      { property: "og:title", content: "Live map — Pulse NOC" },
      { property: "og:description", content: "Geographic view of zones, with incident pulse rings and a weather overlay for outage correlation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Live map" question="Where, geographically, is the trouble?" />
      <Panel title="Zones" description="Prototype uses an abstract grid in place of live geodata">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zoneHealth.map((z) => (
            <div key={z.zone} className="relative overflow-hidden rounded-[10px] border border-hairline bg-surface-2 p-4">
              {z.status === "critical" && <span className="absolute -right-6 -top-6 h-20 w-20 animate-ping rounded-full bg-critical/20" />}
              <div className="flex items-center justify-between"><span className="text-[13px] font-medium">{z.zone}</span><StatusBadge status={z.status} /></div>
              <p className="tnum mt-2 text-[22px] font-semibold">{fmt.format(z.online)}</p>
              <p className="text-[11.5px] text-muted-foreground">subscribers online of {fmt.format(z.subscribers)}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">{z.devices} devices · {z.utilisation}% utilisation</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

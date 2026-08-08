import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable } from "@/components/pulse/data-table";
import { PageHeader, Meter, Pill, StatusBadge } from "@/components/pulse/primitives";
import { devices, type Device } from "@/lib/mock-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

export const Route = createFileRoute("/devices")({
  head: () => ({
    meta: [
      { title: "Devices — Pulse NOC" },
      { name: "description", content: "Routers, NAS, OLTs, switches and access points in one inventory with health, firmware and hosted customers." },
      { property: "og:title", content: "Devices — Pulse NOC" },
      { property: "og:description", content: "Routers, NAS, OLTs, switches and access points in one inventory with health, firmware and hosted customers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [open, setOpen] = useState<Device | null>(null);
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Devices" question="Which boxes are unhealthy, and what do they carry?" />
      <DataTable<Device>
        rows={devices}
        getId={(r) => r.id}
        selectable
        onOpen={setOpen}
        searchPlaceholder="Filter devices — try status:critical kind:OLT zone:west"
        bulkActions={(sel, clear) => (
          <button onClick={() => { toast.success(`Health check queued on ${sel.length} devices`); clear(); }} className="rounded-md border border-hairline px-2 py-1 text-[12px] hover:bg-accent">Run health check</button>
        )}
        columns={[
          { key: "s", header: "Status", render: (r) => <StatusBadge status={r.status} hatched={r.status === "warn"} /> },
          { key: "n", header: "Device", render: (r) => <span className="font-mono text-[12px] font-medium">{r.name}</span> },
          { key: "k", header: "Kind", render: (r) => <Pill>{r.kind}</Pill> },
          { key: "z", header: "Zone", render: (r) => <span className="text-muted-foreground">{r.zone}</span> },
          { key: "ip", header: "Mgmt IP", render: (r) => <span className="font-mono text-[11.5px] text-muted-foreground">{r.mgmtIp}</span> },
          { key: "cpu", header: "CPU", render: (r) => <Meter value={r.cpu} /> },
          { key: "mem", header: "Memory", render: (r) => <Meter value={r.mem} /> },
          { key: "tp", header: "Throughput", align: "right", render: (r) => <span className="tnum">{r.throughputGbps} Gbps</span> },
          { key: "c", header: "Customers", align: "right", render: (r) => <span className="tnum">{r.customers}</span> },
          { key: "u", header: "Uptime", align: "right", render: (r) => <span className="tnum text-muted-foreground">{r.uptimeDays}d</span> },
        ]}
      />
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-[15px]">{open.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-8">
                <div className="flex flex-wrap gap-2"><StatusBadge status={open.status} /><Pill>{open.kind}</Pill><Pill>instance {open.instanceId}</Pill><Pill>{open.firmware}</Pill></div>
                <div className="grid grid-cols-2 gap-2">
                  {[["Zone", open.zone], ["Mgmt IP", open.mgmtIp], ["Load", String(open.load)], ["Uptime", `${open.uptimeDays} days`], ["Hosted customers", String(open.customers)], ["Throughput", `${open.throughputGbps} Gbps`]].map(([k, v]) => (
                    <div key={k} className="rounded-md border border-hairline bg-surface-2 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                      <p className="tnum mt-0.5 text-[12.5px] font-medium">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold">Resources</p>
                  <div className="flex items-center gap-3 text-[12px]"><span className="w-16 text-muted-foreground">CPU</span><Meter value={open.cpu} /></div>
                  <div className="flex items-center gap-3 text-[12px]"><span className="w-16 text-muted-foreground">Memory</span><Meter value={open.mem} /></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => toast.success(`Health check run on ${open.name}`)} className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground">Run health check</button>
                  <button onClick={() => toast.info("Opened config diff — dry run only")} className="rounded-md border border-hairline px-3 py-1.5 text-[12px]">View config</button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

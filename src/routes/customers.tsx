import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable } from "@/components/pulse/data-table";
import { PageHeader, Pill, StatusBadge } from "@/components/pulse/primitives";
import { customers, fmt, type Customer } from "@/lib/mock-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

const stateTone = { onboarded: "healthy", provisioning: "neutral", deboarded: "neutral", failed: "critical" } as const;

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Pulse NOC" },
      { name: "description", content: "Search-first customer inventory with provisioning state, nftables validation, TC tree and upstream sync." },
      { property: "og:title", content: "Customers — Pulse NOC" },
      { property: "og:description", content: "Search-first customer inventory with provisioning state, nftables validation, TC tree and upstream sync." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [open, setOpen] = useState<Customer | null>(null);
  const [confirm, setConfirm] = useState("");
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Customers" question="Is this customer provisioned, shaped and in sync?" />
      <DataTable<Customer>
        rows={customers}
        getId={(r) => String(r.id)}
        onOpen={(c) => { setOpen(c); setConfirm(""); }}
        selectable
        searchPlaceholder="Filter customers — try state:failed nftables:drift"
        bulkActions={(sel, clear) => (
          <button onClick={() => { toast.success(`Upstream sync queued for ${sel.length} customers`); clear(); }} className="rounded-md border border-hairline px-2 py-1 text-[12px] hover:bg-accent">Sync upstream</button>
        )}
        columns={[
          { key: "c", header: "Customer", render: (r) => <span className="font-medium">{r.company}</span> },
          { key: "id", header: "ID", render: (r) => <span className="font-mono text-[11.5px] text-muted-foreground">cust:{r.id}</span> },
          { key: "s", header: "Provisioning", render: (r) => <StatusBadge status={stateTone[r.state]}>{r.state}</StatusBadge> },
          { key: "nft", header: "nftables", render: (r) => <span className={r.nftables === "verified" ? "text-healthy" : r.nftables === "drift" ? "text-warn" : "text-muted-foreground"}>{r.nftables}</span> },
          { key: "tc", header: "TC tree", render: (r) => (r.tcTree ? <span className="text-healthy">present</span> : <span className="text-muted-foreground">none</span>) },
          { key: "bw", header: "Max BW", align: "right", render: (r) => <span className="tnum font-mono text-[11.5px]">{r.maxBandwidth}</span> },
          { key: "ses", header: "Sessions", align: "right", render: (r) => <span className="tnum">{fmt.format(r.activeSessions)}</span> },
          { key: "inst", header: "Instance", align: "right", render: (r) => <span className="tnum text-muted-foreground">{r.instanceId}</span> },
          { key: "sync", header: "Upstream", render: (r) => <Pill>{r.upstreamSync}</Pill> },
        ]}
      />
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[640px]">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[16px]">{open.company}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-8">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={stateTone[open.state]}>{open.state}</StatusBadge>
                  <Pill>cust:{open.id}</Pill><Pill>{open.plan}</Pill><Pill>instance {open.instanceId}</Pill>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[["Subscribers", fmt.format(open.subscribers)], ["Active sessions", fmt.format(open.activeSessions)], ["Max bandwidth", open.maxBandwidth], ["nftables", open.nftables], ["TC tree", open.tcTree ? "present" : "none"], ["Customer since", open.since]].map(([k, v]) => (
                    <div key={k} className="rounded-md border border-hairline bg-surface-2 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                      <p className="tnum mt-0.5 text-[12.5px] font-medium">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-critical/40 bg-critical-soft p-3">
                  <p className="text-[12px] font-medium">Deboard {open.company}</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    Flushes {fmt.format(open.activeSessions)} sessions, clears conntrack, removes nftables rules and deletes the captive record. Type the company name to enable.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={open.company} aria-label="Type company name to confirm" className="h-8 flex-1 rounded-md border border-hairline bg-surface px-2 text-[12px] outline-none focus:border-critical" />
                    <button disabled={confirm !== open.company} onClick={() => { toast.error(`Deboard started for ${open.company}`); setOpen(null); }} className="rounded-md bg-critical px-3 py-1.5 text-[12px] font-medium text-destructive-foreground disabled:opacity-40">Deboard</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

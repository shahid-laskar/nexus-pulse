import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { toast } from "sonner";
import {
  ArrowRight,
  CornerDownLeft,
  Filter,
  Sparkles,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { ALL_NAV_ITEMS } from "./nav";
import { customers, devices, incidents } from "@/lib/mock-data";
import { KeyHint } from "./primitives";

type Mode = "go" | "do" | "ask";

interface Verb {
  label: string;
  destructive?: boolean;
  run: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState<Verb | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setConfirming(null);
    }
  }, [open]);

  const mode: Mode = query.startsWith(">") ? "do" : query.startsWith("?") ? "ask" : "go";
  const term = query.replace(/^[>?]\s*/, "");

  const close = () => onOpenChange(false);

  const verbs: Verb[] = useMemo(
    () => [
      {
        label: "Acknowledge INC-2291 — Upstream transit degradation",
        run: () => {
          toast.success("INC-2291 acknowledged", { description: "Response clock started · owner R. Mehta" });
          navigate({ to: "/incidents" });
        },
      },
      {
        label: "Set max bandwidth 10gbit on vyos-nor-07",
        run: () => toast.success("TC root ceiling updated to 10gbit", { description: "Applied to vyos-nor-07" }),
      },
      {
        label: "Attach QoS profile tier-1g to an IP",
        run: () => navigate({ to: "/qos" }),
      },
      {
        label: "Open maintenance window",
        run: () => navigate({ to: "/maintenance" }),
      },
      {
        label: "Onboard customer on a VyOS instance",
        run: () => navigate({ to: "/provisioning" }),
      },
      {
        label: "Flush ALL sessions for Granite Works",
        destructive: true,
        run: () =>
          toast.error("482 sessions flushed for Granite Works", {
            description: "Conntrack cleared · action written to audit trail",
          }),
      },
      {
        label: "Deboard customer Dunmore Press",
        destructive: true,
        run: () =>
          toast.error("Deboard queued for Dunmore Press", {
            description: "Sessions flushed → conntrack cleared → nftables removed",
          }),
      },
    ],
    [navigate],
  );

  const askSuggestions = [
    { q: "instances with CPU above 80% in the last hour", to: "/devices", chips: "cpu>80 · range:1h" },
    { q: "customers whose nftables ruleset has drifted", to: "/customers", chips: "nftables:drift" },
    { q: "PPPoE sessions over 500 Mbps down", to: "/sessions", chips: "type:PPPoE · down>500" },
    { q: "everything that changed before INC-2291 fired", to: "/changes", chips: "before:INC-2291" },
  ];

  const matchedDevices = devices
    .filter((d) => (d.name + d.mgmtIp).toLowerCase().includes(term.toLowerCase()))
    .slice(0, 5);
  const matchedCustomers = customers
    .filter((c) => (c.company + c.id).toLowerCase().includes(term.toLowerCase()))
    .slice(0, 5);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
        <CommandInput
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setConfirming(null);
          }}
          placeholder="Go to anything · > to run a command · ? to ask in plain English"
        />
        <CommandList className="max-h-[420px]">
          {confirming ? (
            <div className="p-4">
              <div className="flex items-start gap-3 rounded-md border border-critical/40 bg-critical-soft p-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
                <div>
                  <p className="text-[12.5px] font-medium text-foreground">Destructive action</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{confirming.label}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    This is subscriber-visible and cannot be undone. Press{" "}
                    <KeyHint>Enter</KeyHint> to confirm, <KeyHint>Esc</KeyHint> to cancel.
                  </p>
                </div>
              </div>
              <button
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") setConfirming(null);
                }}
                onClick={() => {
                  confirming.run();
                  close();
                }}
                className="mt-3 w-full rounded-md bg-critical px-3 py-2 text-[12.5px] font-medium text-destructive-foreground transition-opacity hover:opacity-90"
              >
                Confirm — {confirming.label}
              </button>
            </div>
          ) : (
            <>
              <CommandEmpty>
                <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
                  Nothing matches “{term}”. Try an IP, a customer ID like{" "}
                  <span className="font-mono">cust:4821</span>, or press{" "}
                  <KeyHint>?</KeyHint> to ask a question.
                </div>
              </CommandEmpty>

              {mode === "go" && (
                <>
                  {matchedDevices.length > 0 && (
                    <CommandGroup heading="Devices">
                      {matchedDevices.map((d) => (
                        <CommandItem
                          key={d.id}
                          onSelect={() => {
                            navigate({ to: "/devices" });
                            close();
                          }}
                        >
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-[12px]">{d.name}</span>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {d.mgmtIp} · {d.zone}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {matchedCustomers.length > 0 && (
                    <CommandGroup heading="Customers">
                      {matchedCustomers.map((c) => (
                        <CommandItem
                          key={c.id}
                          onSelect={() => {
                            navigate({ to: "/customers" });
                            close();
                          }}
                        >
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.company}
                          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                            cust:{c.id}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  <CommandGroup heading="Incidents">
                    {incidents
                      .filter((i) => (i.id + i.title).toLowerCase().includes(term.toLowerCase()))
                      .slice(0, 3)
                      .map((i) => (
                        <CommandItem
                          key={i.id}
                          onSelect={() => {
                            navigate({ to: "/incidents" });
                            close();
                          }}
                        >
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-[11px]">{i.id}</span>
                          <span className="truncate">{i.title}</span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Pages">
                    {ALL_NAV_ITEMS.filter((n) =>
                      (n.label + n.group).toLowerCase().includes(term.toLowerCase()),
                    ).map((n) => (
                      <CommandItem
                        key={n.to}
                        onSelect={() => {
                          navigate({ to: n.to });
                          close();
                        }}
                      >
                        <n.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {n.label}
                        <span className="ml-auto text-[11px] text-muted-foreground">{n.group}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {mode === "do" && (
                <CommandGroup heading="Run a command">
                  {verbs
                    .filter((v) => v.label.toLowerCase().includes(term.toLowerCase()))
                    .map((v) => (
                      <CommandItem
                        key={v.label}
                        onSelect={() => {
                          if (v.destructive) setConfirming(v);
                          else {
                            v.run();
                            close();
                          }
                        }}
                        className={v.destructive ? "text-critical data-[selected=true]:text-critical" : ""}
                      >
                        <Terminal className="h-3.5 w-3.5" />
                        {v.label}
                        <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                          {v.destructive ? "confirm required" : <CornerDownLeft className="h-3 w-3" />}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {mode === "ask" && (
                <CommandGroup heading="Ask — compiles to filters you can inspect">
                  {askSuggestions.map((s) => (
                    <CommandItem
                      key={s.q}
                      onSelect={() => {
                        navigate({ to: s.to });
                        toast.info("Filters applied", { description: s.chips });
                        close();
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate">{s.q}</span>
                      <span className="ml-auto flex items-center gap-1 font-mono text-[10.5px] text-muted-foreground">
                        <Filter className="h-3 w-3" />
                        {s.chips}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

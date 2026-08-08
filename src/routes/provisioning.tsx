import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Pill, StatusBadge } from "@/components/pulse/primitives";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";

const JOBS = [
  { id: "PRV-4411", customer: "Zephyr Airlines", instance: 4, steps: ["done", "done", "done"] },
  { id: "PRV-4412", customer: "Anchor Chemicals", instance: 7, steps: ["done", "running", "pending"] },
  { id: "PRV-4413", customer: "Brightpath Schools", instance: 2, steps: ["done", "failed", "pending"] },
  { id: "PRV-4414", customer: "Copperline Rail", instance: 9, steps: ["done", "failed", "pending"] },
  { id: "PRV-4415", customer: "Dunmore Press", instance: 1, steps: ["done", "done", "running"] },
];
const LABELS = ["create_customer", "initialize_nftables", "initialize_tc"];

export const Route = createFileRoute("/provisioning")({
  head: () => ({
    meta: [
      { title: "Provisioning — Pulse NOC" },
      { name: "description", content: "Multi-step onboarding pipeline: create customer, initialise nftables, apply traffic control — with retry from step." },
      { property: "og:title", content: "Provisioning — Pulse NOC" },
      { property: "og:description", content: "Multi-step onboarding pipeline: create customer, initialise nftables, apply traffic control — with retry from step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function StepIcon({ state }: { state: string }) {
  if (state === "done") return <Check className="h-3 w-3 text-healthy" />;
  if (state === "failed") return <X className="h-3 w-3 text-critical" />;
  if (state === "running") return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-neutral" />;
}

function Page() {
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Provisioning" question="What is in flight, and where did it fail?" />
      <div className="space-y-3">
        {JOBS.map((j) => {
          const failed = j.steps.includes("failed");
          return (
            <Panel key={j.id} title={j.customer} description={`${j.id} · instance ${j.instance}`}
              actions={<StatusBadge status={failed ? "critical" : j.steps.includes("running") ? "neutral" : "healthy"}>{failed ? "failed" : j.steps.includes("running") ? "running" : "complete"}</StatusBadge>}>
              <ol className="flex flex-wrap items-center gap-3">
                {j.steps.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full border border-hairline bg-surface-2"><StepIcon state={s} /></span>
                    <span className="font-mono text-[11.5px]">{LABELS[i]}</span>
                    {i < 2 && <span className="h-px w-8 bg-hairline" />}
                  </li>
                ))}
                {failed && (
                  <li className="ml-auto flex items-center gap-2">
                    <Pill>zone slug collision</Pill>
                    <button onClick={() => toast.success(`Retrying ${j.id} from initialize_nftables`)} className="rounded-md border border-hairline px-2 py-1 text-[12px] hover:bg-accent">Retry from step</button>
                    <button onClick={() => toast.info(`${j.id} rolled back cleanly`)} className="rounded-md border border-hairline px-2 py-1 text-[12px] hover:bg-accent">Roll back</button>
                  </li>
                )}
              </ol>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

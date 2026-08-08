import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Pill, StatusBadge } from "@/components/pulse/primitives";
const WINDOWS = [
  { id: "MW-88", title: "Core firmware rollout — vyos-cor-01..04", when: "Tonight 01:00–03:00", suppress: 214, status: "warn" as const },
  { id: "MW-89", title: "OLT card replacement — olt-wes-19", when: "Tomorrow 02:00–04:30", suppress: 46, status: "neutral" as const },
  { id: "MW-90", title: "Peering session migration — IX-1", when: "Sat 23:00–01:00", suppress: 88, status: "neutral" as const },
];

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance windows — Pulse NOC" },
      { name: "description", content: "Scheduled work with alert-suppression preview so nobody chases a planned outage." },
      { property: "og:title", content: "Maintenance windows — Pulse NOC" },
      { property: "og:description", content: "Scheduled work with alert-suppression preview so nobody chases a planned outage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-[1680px]">
      <PageHeader title="Maintenance" question="What is suppressed, and when?" />
      <div className="space-y-3">
        {WINDOWS.map((w) => (
          <Panel key={w.id} title={w.title} description={`${w.id} · ${w.when}`} actions={<StatusBadge status={w.status}>{w.status === "warn" ? "starts soon" : "scheduled"}</StatusBadge>}>
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
              <Pill>suppresses {w.suppress} alerts</Pill>
              <Pill>notifies on-call</Pill>
              <span>Affected subscribers are notified 2 hours before the window opens.</span>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

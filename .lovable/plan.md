# Pulse — NOC UX Design Specification

A design specification for a modern ISP Network Operations Center, grounded in the uploaded NOC API (VyOS instances, customer onboard/deboard, sessions, conntrack, QoS/TC, nftables status, upstream user sync). No code in this document.

---

## 1. Product Vision

**Philosophy.** The network is always talking. The interface's job is to translate noise into one sentence an engineer can act on. Pulse is a *reading instrument first, control surface second*: default calm, escalating visual weight only when something is wrong.

**Design principles**
1. **Silence is a status.** A healthy network renders as near-monochrome. Color is reserved for deviation.
2. **One question per screen.** Every page answers a single operator question ("what is broken?", "is this customer shaped correctly?").
3. **Everything is addressable.** Every entity has a URL, a command-palette route, and a keyboard path. No state lives only behind a click.
4. **Density with air.** High information density, but organized in fewer, larger blocks — not 20 tiny widgets.
5. **Destructive actions are typed, not clicked.** Flushing sessions or deboarding requires confirming an entity name.
6. **Latency is a feature.** Optimistic UI, prefetch on hover, sub-100ms navigation between cached views.

**Operational goals:** health understood in <5s; from alert to root-cause page in <3 interactions; any customer/device reachable in <2s via palette; every mutating action traceable to an operator.

**Usability goals:** zero-training for read paths; keyboard-complete for power paths; no modal traps; state always recoverable via URL.

**Information hierarchy (global):** Severity → Blast radius → Time → Entity → Detail. A P1 affecting 4,000 subscribers outranks a P2 affecting 3, always, everywhere including sort defaults.

**Visual language.** Near-neutral slate canvas, one restrained accent (deep cyan-blue) used only for interactive affordance and the "self/current" marker. Status uses four hues only. Typography-led hierarchy, borders over shadows, 1px hairlines, generous 8pt rhythm, tabular numerals everywhere numbers change.

**Interaction philosophy.** Navigate with the palette, act in drawers, confirm inline. Drawers preserve context; full-page navigation is for changing the question, not for reading a record.

---

## 2. Information Architecture

**Navigation style:** persistent 240px left rail (collapsible to 56px icon rail, `[`), a slim top context bar (breadcrumb + global time-range + environment + live-tick), and a right-side drawer stack for detail. No top mega-nav, no nested flyouts.

**Rail groups**
- **Operate** — Dashboard (Pulse), Live Map, Incidents, Alerts, Maintenance
- **Network** — Topology, Devices (Routers/VyOS Instances, Switches, OLTs, NAS, Access Points), Interfaces, Backbone & Peering, IPAM
- **Subscribers** — Customers, Sessions (Active / PPPoE / Disconnected), Bandwidth Profiles & QoS, Provisioning Queue, Upstream Users
- **Insight** — Traffic Analytics, Performance Metrics, Capacity Planning, Reports
- **Control** — Automation & Runbooks, Scheduled Tasks, Configuration Management, Change Log
- **System** — Logs, Audit Trail, Users, Roles & Permissions, Integrations, Settings

**Role-adaptive home.** Same IA, different landing + pinned rail: NOC Engineer → Pulse triage; Senior Engineer → Topology + Incidents; Support → Customer Lookup; Team Lead → Incident board + SLA; Ops Manager → Insight; Sysadmin → System. Roles change defaults and pins, never hide navigation (hidden nav breeds tribal knowledge); unauthorized actions render disabled with a reason tooltip.

**Search-first.** `/` focuses scoped search on any list. Global search understands typed entities: an IP, a MAC, a username, a circuit ID, `cust:4821`, `instance:3` all resolve directly to the record — no results page when the match is unambiguous.

**Command palette (`⌘K`)** — three-mode:
- *Go* (default): fuzzy entity + page jump, recents first.
- *Do* (`>`): verbs scoped to current context — "Flush sessions for Acme", "Set max bandwidth 500mbit", "Acknowledge INC-2291". Destructive verbs are tinted and require a second confirm step inside the palette.
- *Ask* (`?`): natural-language query → structured filter chip set applied to a table (never a black-box answer).

Global keys: `g d/i/c/t` go-to, `⌘K` palette, `/` search, `j/k` row nav, `x` select, `e` acknowledge, `.` quick actions, `?` shortcut sheet, `Esc` closes topmost layer only.

---

## 3. Design System

**Type.** Inter Variable (UI) + JetBrains Mono (IPs, IDs, config, logs). Scale: 11/12/13/14/16/20/28/40. Body 13px at 1.5. Numerals tabular + slashed zero. Max 3 weights (400/500/600).

**Space & grid.** 4px base, 8px rhythm. Page gutters 24px (32 ≥1440). 12-col fluid grid, max content 1680px; ultrawide adds a third column rather than stretching. Rail 240 / 56.

**Elevation.** Four levels: flat (page), hairline card (1px border, no shadow), drawer (shadow + 8% scrim), dialog (shadow + 32% scrim). Shadows never used for decoration.

**Radius.** 6px controls, 10px cards, 14px drawers/dialogs, 999px pills.

**Color (light / dark).** Canvas #FAFAFA / #0B0D10. Surface #FFF / #14171C. Hairline #E7E9EC / #22262D. Text 1/2/3: #0E1116-#5B6472-#8A93A1 (inverted in dark). Accent #0B7CA8 / #38B6E6.
**Status (4 only):** Critical #D6455D, Warn #D98A16, Healthy #1F9D6B, Info/Neutral #6B7482. Degraded = Warn + diagonal hatch (never a 5th hue). Every status pairs hue + icon + text, never hue alone.
**Charts:** 6-step categorical ramp derived from accent+teal+violet; sequential ramps for heatmaps; up/down traffic uses fill above/below axis, not two hues.

**Motion.** Durations 80 (hover) / 140 (state) / 220 (drawer) / 320 (page). Easing: standard `cubic-bezier(.2,0,0,1)`, exit `(.4,0,1,1)`. Principles: motion explains origin (drawers slide from the edge that owns them), never blocks input, never animates live data values except a 300ms color flash on change. `prefers-reduced-motion` → opacity-only.

**Components (behavioral contracts)**
- *Buttons:* primary (accent, one per view), secondary (hairline), ghost, danger (outline until confirmed). Loading replaces label with spinner at fixed width — no layout shift.
- *Inputs/Forms:* label above, help below, error replaces help; validate on blur, re-validate on change; async validation shows an inline spinner in the field.
- *Dropdowns/Comboboxes:* typeahead by default over 7 items; multi-select shows chips with overflow "+3".
- *Tables:* see §6.
- *Cards:* title row + optional right-aligned action menu; body never scrolls independently.
- *Stat widget:* value (28px tabular) + delta vs prior period + 40px sparkline + threshold marker. Never a bare number.
- *Notifications:* toasts bottom-right, 5s, stacked max 3, undo where reversible; critical alerts never use toasts — they go to the alert bar.
- *Drawer:* right, 480/720/full, stackable to 2 with the parent dimmed and still visible; URL updates.
- *Dialog:* only for destructive/blocking confirmation. Typed confirmation for flush/deboard/config-push.
- *Tabs:* in-page section switch only, reflected in URL.
- *Timeline:* vertical, left-gutter timestamps (relative + absolute on hover), system vs human events differentiated by icon weight.
- *Activity feed:* grouped by actor+action within 5-minute windows.
- *Loading:* skeletons matching final layout for first paint; inline shimmer on refresh; never a full-page spinner after first load.
- *Empty:* one sentence stating what will appear + one primary action. Distinguish "nothing yet" from "nothing matches filters" (latter offers Clear filters).
- *Error:* what failed / what it affects / retry + copy trace ID. Partial failures degrade per-widget, never blank the page.
- *Progress:* determinate for provisioning jobs with named steps (create → nftables → TC), mirroring the onboard pipeline.
- *Filters:* chip bar above table; each chip is a popover; filter set is URL-encoded and savable as a named view.
- *Badges/Tags:* badges = system state (uppercase 11px, hue-coded); tags = human labels (neutral, user color optional).
- *Data viz standards:* y-axis starts at zero for volume, auto for latency; shared crosshair across stacked charts; annotations for deploys/incidents; always show last-updated timestamp; units always labeled (Mbps vs MB/s never ambiguous).

**Accessibility.** AA minimum, AAA for body text; 3:1 for graphical/status. Visible 2px focus ring with offset, logical tab order, focus trap + restore in overlays, live regions for alert counts (polite) and critical alerts (assertive), all icon buttons labeled, all charts paired with an accessible data table toggle.

**Dark/light.** Not inverted — separately tuned. Dark reduces status saturation ~8% and raises surfaces with lightness, not shadow. Follows system by default; manual override persisted. NOC wall-display mode: dark, +25% type scale, no hover-only info.

---

## 4. Dashboard ("Pulse")

Three horizontal bands, no widget soup.

**Band 1 — Verdict (sticky, 96px).** One plain-language health sentence ("Network nominal — 3 warnings, 0 incidents") with a health arc; then 5 stat widgets: Subscribers Online, Aggregate Throughput (up/down), Backbone Utilization (peak link named), Session Churn (5-min), Provisioning Queue. Right side: live tick + Quick Actions (`.`) — Onboard customer, Open maintenance, Declare incident, Run health check.

**Band 2 — Attention.** Left 60%: unified **Attention Stream** — active incidents and unacked alerts in one severity-ranked list with blast radius ("~4,120 subscribers, Zone West"), age, owner avatar; inline Ack / Assign / Snooze; `e` to ack from keyboard. Right 40%: **Regional Health strip** — zones as horizontal bars (subscriber count × health), each expanding to per-instance detail; a geographic map is available on Live Map but is not the dashboard default because coordinates rarely answer "what's broken".

**Band 3 — Signals.** Traffic time-series (aggregate + top-5 instances, annotated with incidents), Instance Health heatmap (rows = VyOS instances, columns = 5-min buckets, cell = worst-of CPU/load/uptime deviation), Top Talkers, and Recent Activity (audit-derived: who onboarded/flushed/reshaped what).

Weather appears only as an overlay on the Live Map for regions with active outages (correlating storms to fiber/power events) — not as a dashboard tile.

Everything is time-range aware from the top bar; all panels are collapsible and reorderable per user, persisted per role.

---

## 5. Screen Designs

Each screen spec follows the same contract: **Purpose / Primary tasks / Secondary / Flow / Layout / Components / Interaction / Responsive / Loading / Empty / Error / Motion / A11y / Rationale.** Core screens:

- **Pulse Dashboard** — §4.
- **Live Map** — geo + logical overlay, clustering by zone, incident pulse rings, click → device drawer.
- **Topology** — force/hierarchical graph (core → NAS → OLT → CPE), path highlight between any two nodes, failure blast-radius shading, saved layouts.
- **Incidents** — board + list duality (§7).
- **Alerts** — rule-grouped, dedup counts, one-click "create rule from this alert".
- **Maintenance Windows** — calendar + timeline, alert suppression preview ("this window silences 214 alerts").
- **Device Inventory** (+ Routers/VyOS Instances, Switches, OLTs, NAS, Wireless) — one table shape, typed facets; device drawer with Health / Interfaces / Config / Sessions / History tabs. Instance page surfaces uptime/load from the health endpoint plus hosted-customer count.
- **Customers** — search-first table; customer drawer is the operational hub: provisioning state (onboarded/deboarded, nftables validation, TC tree presence), active sessions, QoS assignments, upstream sync state, and a full action timeline.
- **Customer Provisioning** — stepper mirroring create → nftables → TC with per-step status, retry-from-step, and rollback; deboard shows an explicit destructive preflight (sessions to flush, conntrack entries, rules to remove).
- **Sessions (Active / PPPoE / Disconnected)** — live-updating table, per-row disconnect by IP, bulk flush behind typed confirm, session drawer with throughput sparkline and conntrack inspector.
- **QoS & Bandwidth Profiles** — profile library, per-IP attachments, live class byte/packet counters, TC tree visualization (HTB/fq_codel as a nested bar diagram), inline max-bandwidth edit with unit-aware input.
- **Conntrack Inspector** — advanced-user table with protocol/state facets and flush scoped to selection.
- **Traffic Analytics / Performance Metrics / Real-Time Monitoring** — §8.
- **Capacity Planning** — projected saturation dates per link/instance with confidence band.
- **Configuration Management** — versioned configs, side-by-side diff, dry-run, staged push with per-device result.
- **Logs / Audit Trail** — unified query bar, live tail with pause-on-scroll, facet sidebar, permalink to a timestamp; audit is append-only, exportable, filterable by actor and blast radius.
- **Reports** — templated + scheduled, export to PDF/CSV.
- **Automation & Runbooks** — trigger→condition→action builder; runbooks executable inline from incidents.
- **Scheduled Tasks**, **Notifications & routing**, **Knowledge Base**, **Users**, **Roles & Permissions** (matrix editor with diff-before-save), **Settings**, **Integrations**.
- **New pages proposed:** *Provisioning Queue* (all in-flight jobs, retryable), *Change Log* (every mutation network-wide, one stream — the fastest "what changed before it broke" answer), *Shift Handover* (auto-drafted summary of the shift: incidents, changes, watch items), *Blast Radius Explorer* (pick a node → see impacted customers before acting).

**Responsive:** ≥1440 three-column; 1024–1440 two-column, rail auto-collapses; tablet single column with bottom action bar; mobile is triage-only (Attention Stream, ack, escalate, read incident) — no bulk destructive actions on small screens, deliberately.

---

## 6. Data Tables

One table engine, everywhere. Row height 36 (compact 30 / comfortable 44, user-set). Virtualized with infinite scroll and a sticky "N new rows" pill instead of auto-jumping. Sticky header + first column; column pinning, resizing, reordering, visibility — persisted per view. Multi-sort with Shift. Selection via `x`/Shift-range, with a floating bulk action bar showing count and an explicit affected-entity summary. Inline edit on double-click or `Enter`, optimistic with undo toast. Expandable rows for nested data (session → conntrack). Hover quick-preview card after 400ms; `Space` opens the detail drawer without leaving the row. Right-click context menu mirrors the palette's *Do* verbs. Smart search parses `status:down instance:3 bw>500mbit` alongside free text. Saved views are shareable URLs with optional team pinning. Live updates flash changed cells for 300ms and never reorder while the user is scrolling or has a selection.

---

## 7. Incident Management

**Detect:** alerts correlate into a single incident by device/zone/time proximity; the correlation is shown, not hidden ("6 alerts grouped — why?").
**Classify:** severity auto-proposed from blast radius (subscribers affected × service class); operator can override with a required one-line reason.
**Acknowledge:** single key `e`; ack assigns ownership and starts the response clock, visible to everyone.
**Escalate:** policy ladder with timers rendered as a countdown; manual escalate always available with a target picker.
**Timeline:** the incident *is* the timeline — alerts, metric annotations, config changes, commands run, comments, and status transitions in one stream; comments support `@` mentions and pasted charts that stay live.
**Resolve:** requires cause category + resolution note; auto-detects "signals recovered" and suggests resolution rather than auto-closing.
**Postmortem:** auto-drafted from the timeline (detection latency, ack latency, MTTR, contributing changes), editable, with action items that become tracked tasks.
**Automation suggestions:** matching runbooks surface inline with a dry-run preview; a rule can be authored directly from a resolved incident.
**Collaboration:** presence avatars, per-incident live cursor on the timeline, "who is doing what" status line to prevent duplicate remediation.

---

## 8. Monitoring Experience

Live metrics stream over WebSocket with a visible connection state and stale-data hatching when the feed lags. Time-series charts share one crosshair and one time range; drag-to-zoom syncs across every chart on the page; annotations mark deploys, config pushes, and incidents. Heatmaps for entity × time density (instances, OLT ports, zones). Status indicators use shape + hue + text. Topology visualization animates traffic direction with subtle edge flow (disabled under reduced motion). Network path visualization renders customer → NAS → core → upstream with per-hop latency/loss. Historical comparison overlays the same window from -1d/-1w as a ghost line. Root-cause hints rank correlated changes and anomalies with a plain-English "most likely" statement plus its evidence links. AI summaries appear as a collapsible strip at the top of incidents and long dashboards, always labeled as generated, always citing the underlying panels — never replacing raw data.

---

## 9. Micro Interactions

Hover: 80ms surface lift + row action reveal, prefetch of the linked record. Focus: instant ring, no animation. Click: 60ms scale-98 on buttons only. Loading: skeleton → content crossfade 140ms. Error: 120ms 3px shake on the field, once. Success: checkmark draw-in, then fade to neutral in 1.2s. Selection: 100ms left-edge accent bar. Cards: hairline brightens; no lift-and-shadow. Charts: crosshair follows with no easing (latency reads as lag). Filters: chip pops in from the control that created it. Search: results reflow with position-preserving transitions. Sidebar: width transition 220ms, labels fade at 60% progress. Notifications: slide-up + stack collapse. Drawers: 220ms slide with parent scaling to 0.995. Dialogs: 140ms fade + 2px rise. Page transitions: content-only crossfade, chrome persists.

---

## 10. Accessibility

Keyboard: every action reachable without a mouse; shortcut sheet via `?`; roving tabindex in tables and graphs; skip-to-content. Screen readers: semantic landmarks, table headers with scope, live regions scoped so live-tick data never spams announcements, charts expose a data-table alternative and an aria summary. Contrast: AA/AAA as in §3; status never encoded by hue alone. Focus: trapped and restored across drawer/dialog stacks; `Esc` unwinds one layer. ARIA used only where semantics are missing. Reduced motion: opacity-only, no edge flow, no auto-scroll. Touch: 44px targets in touch mode, swipe-to-dismiss drawers, long-press for context menus. Displays: 1280 minimum supported; ultrawide adds columns and a persistent inspector rather than stretching lines beyond 90ch; wall-display mode for 4K NOC screens.

---

## 11. UX Rationale (key decisions)

- **Unified Attention Stream instead of separate alert and incident widgets** — operators triage by severity, not by data model. Rejected split panels because they force the operator to merge two lists mentally under stress.
- **Drawers over full-page detail for records** — preserves the list context and the operator's place in a triage queue; full navigation loses hard-won scroll position and filters.
- **Palette-first navigation** — a 40-page IA cannot be traversed by clicking in under 2s; the palette makes depth free, so the rail can stay shallow and calm.
- **Four status colors only** — more hues degrade into decoration and fail colorblind users; scarcity is what makes red mean something at 3am.
- **Typed confirmation for flush/deboard** — these are irreversible and subscriber-visible; a click-through dialog is muscle memory, typing a name is not.
- **Blast radius on every alert** — converts a technical event into a business decision instantly, which is the single biggest driver of correct prioritization.
- **No auto-reordering live tables** — moving targets cause misclicks on destructive rows; a "new rows" pill gives control back.
- **Health sentence before charts** — reading a chart takes seconds an operator may not have; the sentence is the answer, the charts are the evidence.
- **Roles change defaults, not visibility** — hidden features create support tickets and shadow processes; disabled-with-reason teaches the permission model.
- **Provisioning as a visible multi-step pipeline** — the underlying operation is genuinely multi-stage and partially failable; hiding it behind one spinner makes partial failures undebuggable.
- **Mobile is triage-only** — offering bulk destructive network operations on a phone invites catastrophic mistakes.

---

## 12. Future Vision

Natural-language operations ("show me OLTs in Zone West with rising ONT errors this week") compiling to inspectable filters, never opaque answers. Predictive monitoring: seasonal-baseline anomaly detection with per-metric learned envelopes, and pre-failure signatures (optical power drift, error-rate ramps) that open advisory tickets before customers notice. A NOC copilot that drafts incident summaries, proposes runbooks with dry-run diffs, and writes the shift handover. Capacity planning with what-if simulation — add subscribers or reroute a link and see projected saturation. A digital twin of the network for rehearsing maintenance and validating config changes against a simulated topology before touching production. Closed-loop automation with human-approved policies and automatic rollback on regression. Customer-impact-aware change scheduling that picks the lowest-blast-radius window automatically. Cross-org anonymized benchmarking for upstream transit quality.

---

### Technical notes for later implementation
React + TypeScript + Tailwind v4 with all tokens as CSS custom properties in `src/styles.css` (oklch), semantic-only utilities, TanStack Router routes matching the IA, TanStack Query for the `/api/v1/noc/*` surface, virtualized table primitive, and a single drawer/dialog stack manager. Nothing in this document has been implemented yet.

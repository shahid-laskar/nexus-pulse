/**
 * Deterministic mock network data for the Pulse NOC prototype.
 * Seeded PRNG so SSR and client render identically (no hydration drift).
 */

export type Severity = "critical" | "warn" | "healthy" | "neutral";

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)]!;
const int = (r: () => number, min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;

export const ZONES = ["Zone North", "Zone West", "Zone East", "Zone South", "Metro Core"] as const;
export type Zone = (typeof ZONES)[number];

/* ------------------------------------------------------------------ devices */

export type DeviceKind = "VyOS Router" | "NAS" | "OLT" | "Switch" | "Access Point";

export interface Device {
  id: string;
  instanceId: number;
  name: string;
  kind: DeviceKind;
  zone: Zone;
  mgmtIp: string;
  status: Severity;
  uptimeDays: number;
  cpu: number;
  mem: number;
  load: number;
  throughputGbps: number;
  customers: number;
  firmware: string;
  lastSeenMin: number;
}

const KINDS: DeviceKind[] = ["VyOS Router", "NAS", "OLT", "Switch", "Access Point"];
const NAME_PREFIX: Record<DeviceKind, string> = {
  "VyOS Router": "vyos",
  NAS: "nas",
  OLT: "olt",
  Switch: "sw",
  "Access Point": "ap",
};

export const devices: Device[] = Array.from({ length: 64 }, (_, i) => {
  const r = mulberry(1000 + i * 17);
  const kind = i < 12 ? "VyOS Router" : pick(r, KINDS);
  const zone = pick(r, ZONES);
  const roll = r();
  const status: Severity = roll > 0.94 ? "critical" : roll > 0.82 ? "warn" : "healthy";
  return {
    id: `dev-${i + 1}`,
    instanceId: i + 1,
    name: `${NAME_PREFIX[kind]}-${zone.split(" ")[1]?.slice(0, 3).toLowerCase() ?? "core"}-${String(i + 1).padStart(2, "0")}`,
    kind,
    zone,
    mgmtIp: `10.${int(r, 10, 60)}.${int(r, 0, 255)}.${int(r, 2, 250)}`,
    status,
    uptimeDays: int(r, 1, 640),
    cpu: status === "critical" ? int(r, 78, 97) : status === "warn" ? int(r, 55, 80) : int(r, 4, 42),
    mem: status === "critical" ? int(r, 70, 94) : int(r, 22, 68),
    load: Number((r() * (status === "healthy" ? 1.6 : 6)).toFixed(2)),
    throughputGbps: Number((r() * 42).toFixed(1)),
    customers: int(r, 0, 340),
    firmware: pick(r, ["1.4.2-rolling", "1.4.1", "1.5.0-epa", "1.3.8"]),
    lastSeenMin: status === "critical" ? int(r, 3, 40) : 0,
  };
});

/* ---------------------------------------------------------------- customers */

export type ProvisionState = "onboarded" | "deboarded" | "provisioning" | "failed";

export interface Customer {
  id: number;
  company: string;
  slug: string;
  instanceId: number;
  zone: Zone;
  state: ProvisionState;
  nftables: "verified" | "drift" | "missing";
  tcTree: boolean;
  maxBandwidth: string;
  activeSessions: number;
  subscribers: number;
  upstreamSync: "in-sync" | "pending" | "conflict";
  plan: string;
  since: string;
}

const COMPANIES = [
  "Aurora Textiles", "Beacon Logistics", "Cedar Health", "Delta Foundry", "Everline Media",
  "Fairmont Hotels", "Granite Works", "Harbour Freight", "Indigo Labs", "Juniper Retail",
  "Kestrel Systems", "Lumen Academy", "Marlow Shipping", "Northgate Bank", "Orchid Foods",
  "Pinnacle Mining", "Quarry Cement", "Redwood Estates", "Solstice Energy", "Tidewater Marine",
  "Umbra Studios", "Vertex Motors", "Westbrook Clinic", "Xenon Print", "Yardley Grain",
  "Zephyr Airlines", "Anchor Chemicals", "Brightpath Schools", "Copperline Rail", "Dunmore Press",
];

export const customers: Customer[] = COMPANIES.map((company, i) => {
  const r = mulberry(4200 + i * 31);
  const roll = r();
  const state: ProvisionState =
    roll > 0.93 ? "failed" : roll > 0.88 ? "provisioning" : roll > 0.84 ? "deboarded" : "onboarded";
  const nftRoll = r();
  return {
    id: 4800 + i,
    company,
    slug: company.toLowerCase().replace(/[^a-z]+/g, "-"),
    instanceId: int(r, 1, 12),
    zone: pick(r, ZONES),
    state,
    nftables: state !== "onboarded" ? "missing" : nftRoll > 0.9 ? "drift" : "verified",
    tcTree: state === "onboarded",
    maxBandwidth: pick(r, ["100mbit", "250mbit", "500mbit", "1gbit", "2gbit", "10gbit"]),
    activeSessions: state === "onboarded" ? int(r, 3, 480) : 0,
    subscribers: int(r, 12, 900),
    upstreamSync: pick(r, ["in-sync", "in-sync", "in-sync", "pending", "conflict"] as const),
    plan: pick(r, ["Business Fibre", "Enterprise Dedicated", "Campus WiFi", "Metro Ethernet"]),
    since: `20${int(r, 19, 25)}-${String(int(r, 1, 12)).padStart(2, "0")}-${String(int(r, 1, 28)).padStart(2, "0")}`,
  };
});

/* ----------------------------------------------------------------- sessions */

export interface Session {
  id: string;
  ip: string;
  mac: string;
  username: string;
  customerId: number;
  customer: string;
  instanceId: number;
  type: "PPPoE" | "DHCP" | "Captive";
  state: "active" | "idle" | "disconnected";
  downMbps: number;
  upMbps: number;
  durationMin: number;
  profile: string;
  conntrack: number;
}

export const sessions: Session[] = Array.from({ length: 220 }, (_, i) => {
  const r = mulberry(7700 + i * 13);
  const cust = customers[int(r, 0, customers.length - 1)]!;
  const roll = r();
  return {
    id: `sess-${i + 1}`,
    ip: `100.${int(r, 64, 96)}.${int(r, 0, 255)}.${int(r, 2, 250)}`,
    mac: Array.from({ length: 6 }, () => int(r, 16, 255).toString(16)).join(":"),
    username: `${cust.slug.split("-")[0]}.${pick(r, ["ops", "wifi", "ap01", "guest", "vlan20", "site3"])}`,
    customerId: cust.id,
    customer: cust.company,
    instanceId: cust.instanceId,
    type: pick(r, ["PPPoE", "PPPoE", "DHCP", "Captive"] as const),
    state: roll > 0.9 ? "disconnected" : roll > 0.78 ? "idle" : "active",
    downMbps: Number((r() * 940).toFixed(1)),
    upMbps: Number((r() * 320).toFixed(1)),
    durationMin: int(r, 1, 5200),
    profile: pick(r, ["tier-100", "tier-250", "tier-500", "tier-1g", "burst-2g"]),
    conntrack: int(r, 4, 2400),
  };
});

/* -------------------------------------------------------- alerts & incidents */

export type IncidentStatus = "triggered" | "acknowledged" | "mitigating" | "resolved";

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  zone: Zone;
  device: string;
  subscribersAffected: number;
  ageMin: number;
  owner: string | null;
  alertCount: number;
  summary: string;
  cause: string;
}

const OWNERS = ["R. Mehta", "A. Okafor", "L. Tanaka", "S. Villanueva", "J. Fitzgerald", "K. Nowak"];

export const incidents: Incident[] = [
  {
    id: "INC-2291",
    title: "Upstream transit degradation on Metro Core peering",
    severity: "critical",
    status: "triggered",
    zone: "Metro Core",
    device: "vyos-cor-03",
    subscribersAffected: 4120,
    ageMin: 7,
    owner: null,
    alertCount: 6,
    summary:
      "Packet loss on the primary transit link climbed from 0.02% to 4.8% over 6 minutes. Latency to first upstream hop is up 340%.",
    cause: "Correlated with a BGP session flap on peer AS64512 at 02:31.",
  },
  {
    id: "INC-2290",
    title: "OLT olt-wes-19 PON port 4 optical power drop",
    severity: "critical",
    status: "acknowledged",
    zone: "Zone West",
    device: "olt-wes-19",
    subscribersAffected: 812,
    ageMin: 34,
    owner: "A. Okafor",
    alertCount: 3,
    summary: "Rx power fell below -27 dBm across 812 ONTs on a single PON tree.",
    cause: "Suspected fibre damage; field team dispatched to splice point SP-114.",
  },
  {
    id: "INC-2288",
    title: "TC queue drops rising on vyos-nor-07",
    severity: "warn",
    status: "mitigating",
    zone: "Zone North",
    device: "vyos-nor-07",
    subscribersAffected: 244,
    ageMin: 96,
    owner: "L. Tanaka",
    alertCount: 4,
    summary: "HTB class ceilings saturating during evening peak; fq_codel drop rate at 1.9%.",
    cause: "Root ceiling still set to 1gbit after a capacity upgrade to 10gbit.",
  },
  {
    id: "INC-2285",
    title: "Conntrack table nearing limit on nas-eas-22",
    severity: "warn",
    status: "acknowledged",
    zone: "Zone East",
    device: "nas-eas-22",
    subscribersAffected: 96,
    ageMin: 178,
    owner: "S. Villanueva",
    alertCount: 2,
    summary: "Connection tracking table at 86% of configured maximum.",
    cause: "One customer generating ~180k short-lived UDP flows per minute.",
  },
  {
    id: "INC-2279",
    title: "Provisioning pipeline failures for 3 customers",
    severity: "warn",
    status: "triggered",
    zone: "Zone South",
    device: "vyos-sou-11",
    subscribersAffected: 0,
    ageMin: 240,
    owner: null,
    alertCount: 3,
    summary: "nftables initialisation step failed after successful customer creation.",
    cause: "Zone name collision with a previously deboarded customer slug.",
  },
  {
    id: "INC-2274",
    title: "Access point cluster unreachable — Zone East campus",
    severity: "healthy",
    status: "resolved",
    zone: "Zone East",
    device: "ap-eas-41",
    subscribersAffected: 310,
    ageMin: 1440,
    owner: "J. Fitzgerald",
    alertCount: 8,
    summary: "14 access points dropped off management network for 22 minutes.",
    cause: "PoE switch stack reboot during an unscheduled firmware rollout.",
  },
];

export interface AlertRow {
  id: string;
  rule: string;
  severity: Severity;
  entity: string;
  zone: Zone;
  value: string;
  threshold: string;
  count: number;
  ageMin: number;
  acked: boolean;
  incidentId: string | null;
}

export const alerts: AlertRow[] = Array.from({ length: 34 }, (_, i) => {
  const r = mulberry(9100 + i * 7);
  const d = devices[int(r, 0, devices.length - 1)]!;
  const rule = pick(r, [
    "CPU sustained > 80%",
    "Interface errors > 100/min",
    "Packet loss > 1%",
    "Conntrack utilisation > 80%",
    "TC queue drops > 1%",
    "Uptime reset detected",
    "Optical Rx power < -26 dBm",
    "Session churn spike",
    "nftables ruleset drift",
  ]);
  const roll = r();
  return {
    id: `ALT-${8400 + i}`,
    rule,
    severity: roll > 0.85 ? "critical" : roll > 0.5 ? "warn" : "neutral",
    entity: d.name,
    zone: d.zone,
    value: `${int(r, 60, 99)}%`,
    threshold: "80%",
    count: int(r, 1, 42),
    ageMin: int(r, 1, 900),
    acked: r() > 0.55,
    incidentId: r() > 0.75 ? pick(r, incidents).id : null,
  };
});

/* ------------------------------------------------------------------- series */

export interface Point {
  t: string;
  down: number;
  up: number;
  baseline: number;
}

export const trafficSeries: Point[] = Array.from({ length: 96 }, (_, i) => {
  const r = mulberry(300 + i);
  const hour = (i * 15) / 60;
  const diurnal = 0.55 + 0.45 * Math.sin(((hour - 6) / 24) * Math.PI * 2);
  const down = Number((620 * diurnal + r() * 60).toFixed(1));
  return {
    t: `${String(Math.floor(hour)).padStart(2, "0")}:${String((i * 15) % 60).padStart(2, "0")}`,
    down,
    up: Number((down * 0.31 + r() * 18).toFixed(1)),
    baseline: Number((610 * diurnal).toFixed(1)),
  };
});

export const sparkline = (seed: number, n = 24) => {
  const r = mulberry(seed);
  let v = 50;
  return Array.from({ length: n }, (_, i) => {
    v = Math.max(6, Math.min(96, v + (r() - 0.48) * 18));
    return { i, v: Number(v.toFixed(1)) };
  });
};

/** rows = instances, cols = 5-min buckets. value 0..100 deviation score */
export const heatmap = devices.slice(0, 12).map((d, row) => ({
  device: d.name,
  cells: Array.from({ length: 36 }, (_, col) => {
    const r = mulberry(row * 997 + col * 13);
    const base = r() * 34;
    const spike = row === 2 && col > 28 ? 60 : row === 5 && col > 22 && col < 27 ? 42 : 0;
    return Math.min(100, Math.round(base + spike));
  }),
}));

/* ----------------------------------------------------------------- activity */

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  agoMin: number;
  kind: "provision" | "destructive" | "config" | "incident" | "auth";
}

export const activity: ActivityItem[] = [
  { id: "a1", actor: "R. Mehta", action: "flushed all sessions for", target: "Granite Works", agoMin: 3, kind: "destructive" },
  { id: "a2", actor: "system", action: "escalated", target: "INC-2291 to on-call tier 2", agoMin: 5, kind: "incident" },
  { id: "a3", actor: "A. Okafor", action: "acknowledged", target: "INC-2290", agoMin: 12, kind: "incident" },
  { id: "a4", actor: "L. Tanaka", action: "set max bandwidth 10gbit on", target: "vyos-nor-07 / Redwood Estates", agoMin: 19, kind: "config" },
  { id: "a5", actor: "S. Villanueva", action: "onboarded", target: "Zephyr Airlines on instance 4", agoMin: 41, kind: "provision" },
  { id: "a6", actor: "system", action: "auto-suppressed 214 alerts for", target: "maintenance window MW-88", agoMin: 63, kind: "config" },
  { id: "a7", actor: "K. Nowak", action: "deboarded", target: "Dunmore Press", agoMin: 92, kind: "destructive" },
  { id: "a8", actor: "J. Fitzgerald", action: "attached QoS tier-1g to", target: "100.72.14.9", agoMin: 118, kind: "config" },
];

/* -------------------------------------------------------------- aggregates */

export const zoneHealth = ZONES.map((zone, i) => {
  const zoneDevices = devices.filter((d) => d.zone === zone);
  const crit = zoneDevices.filter((d) => d.status === "critical").length;
  const warn = zoneDevices.filter((d) => d.status === "warn").length;
  const subs = 8000 + i * 3100;
  return {
    zone,
    devices: zoneDevices.length,
    critical: crit,
    warn,
    subscribers: subs,
    online: Math.round(subs * (crit ? 0.71 : warn ? 0.94 : 0.988)),
    utilisation: 42 + i * 11,
    status: (crit ? "critical" : warn ? "warn" : "healthy") as Severity,
  };
});

export const kpis = {
  subscribersOnline: zoneHealth.reduce((a, z) => a + z.online, 0),
  subscribersTotal: zoneHealth.reduce((a, z) => a + z.subscribers, 0),
  throughputDown: 742.4,
  throughputUp: 231.8,
  backbonePeak: 78,
  backbonePeakLink: "MTR-CORE ⇄ IX-1 (100G)",
  churn5m: 412,
  provisioningQueue: 7,
};

export const owners = OWNERS;

export const findCustomer = (id: number) => customers.find((c) => c.id === id);
export const findDevice = (id: string) => devices.find((d) => d.id === id);
export const findIncident = (id: string) => incidents.find((i) => i.id === id);

export const fmt = new Intl.NumberFormat("en-US");
export const ago = (min: number) =>
  min < 1 ? "now" : min < 60 ? `${min}m` : min < 1440 ? `${Math.floor(min / 60)}h` : `${Math.floor(min / 1440)}d`;

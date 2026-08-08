import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarClock,
  Gauge,
  History,
  Map,
  Network,
  Radio,
  ShieldCheck,
  Siren,
  Users,
  Waypoints,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: typeof Gauge;
  badge?: "incidents" | "alerts" | "queue";
  shortcut?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Operate",
    items: [
      { label: "Pulse", to: "/", icon: Gauge, shortcut: "g d" },
      { label: "Incidents", to: "/incidents", icon: Siren, badge: "incidents", shortcut: "g i" },
      { label: "Alerts", to: "/alerts", icon: AlertTriangle, badge: "alerts" },
      { label: "Maintenance", to: "/maintenance", icon: CalendarClock },
    ],
  },
  {
    label: "Network",
    items: [
      { label: "Topology", to: "/topology", icon: Waypoints, shortcut: "g t" },
      { label: "Devices", to: "/devices", icon: Boxes },
      { label: "Live Map", to: "/map", icon: Map },
    ],
  },
  {
    label: "Subscribers",
    items: [
      { label: "Customers", to: "/customers", icon: Users, shortcut: "g c" },
      { label: "Sessions", to: "/sessions", icon: Radio },
      { label: "QoS & Bandwidth", to: "/qos", icon: Network },
      { label: "Provisioning", to: "/provisioning", icon: ShieldCheck, badge: "queue" },
    ],
  },
  {
    label: "Insight",
    items: [
      { label: "Traffic Analytics", to: "/analytics", icon: BarChart3 },
      { label: "Change Log", to: "/changes", icon: History },
      { label: "Shift Handover", to: "/handover", icon: Activity },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

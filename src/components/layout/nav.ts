/**
 * Single source of truth for navigation.
 * Used by the sidebar, the breadcrumb resolver and the ⌘K command palette.
 */
import {
  Activity, Airplay, BadgeIndianRupee, Banknote, Building, ClipboardList, FileBarChart,
  Gauge, GitPullRequest, Globe, KeyRound, Layers, LayoutDashboard, LineChart, Network,
  Palette, Radio, Router, Scale, Server, Settings, ShieldAlert, ShieldCheck, Siren,
  Store, Ticket, User, UserCheck, UserPlus, Users, Wifi,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavLeaf {
  to: string
  label: string
  icon: LucideIcon
  /** capability key from the auth store, or 'always' */
  can: Capability
  keywords?: string
  badge?: 'live'
}

export interface NavGroup {
  label: string
  can: Capability | Capability[]
  items: NavLeaf[]
}

export type Capability =
  | 'always'
  | 'isSuper'
  | 'canManageUsers'
  | 'canManageCircles'
  | 'canManageBAs'
  | 'canManageCustomers'
  | 'canAccessNOC'
  | 'canAccessEB'

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    can: 'always',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, can: 'always', keywords: 'home summary kpi' },
      { to: '/reports', label: 'Reports', icon: FileBarChart, can: 'always', keywords: 'export csv scheduled' },
    ],
  },
  {
    label: 'Hotspot Network',
    can: 'always',
    items: [
      { to: '/hotspots', label: 'Hotspots & APs', icon: Wifi, can: 'always', keywords: 'access point venue ssid uptime' },
      { to: '/noc/sessions', label: 'Live Sessions', icon: Radio, can: 'always', badge: 'live', keywords: 'clients online users' },
      { to: '/vouchers', label: 'Vouchers & Codes', icon: Ticket, can: 'always', keywords: 'guest code prepaid pin' },
      { to: '/plans', label: 'Plans & Tariffs', icon: BadgeIndianRupee, can: 'always', keywords: 'package fup speed price' },
      { to: '/portal-studio', label: 'Portal Studio', icon: Palette, can: 'always', keywords: 'captive branding splash theme' },
      { to: '/aaa', label: 'AAA / RADIUS', icon: KeyRound, can: 'always', keywords: 'radius auth accounting nas' },
    ],
  },
  {
    label: 'Master Data',
    can: 'canManageCustomers',
    items: [
      { to: '/circles', label: 'Circles & BAs', icon: Globe, can: 'canManageCircles', keywords: 'region territory' },
      { to: '/customers', label: 'Customers', icon: Users, can: 'canManageCustomers', keywords: 'accounts subscribers' },
      { to: '/tenants', label: 'Resellers & Tenants', icon: Store, can: 'isSuper', keywords: 'partner franchise multi tenant' },
      { to: '/billing', label: 'Billing & Invoices', icon: Banknote, can: 'canManageCustomers', keywords: 'revenue payment invoice' },
    ],
  },
  {
    label: 'Compliance',
    can: 'always',
    items: [
      { to: '/compliance/pm-wani', label: 'PM-WANI', icon: Scale, can: 'always', keywords: 'pdoa pdo app provider registry kyc' },
      { to: '/admin/ipdr', label: 'IPDR & Lawful', icon: ShieldAlert, can: 'isSuper', keywords: 'log retention case dot' },
      { to: '/admin/router-approvals', label: 'Router Approvals', icon: ShieldCheck, can: 'isSuper', keywords: 'proposal approve cpe' },
      { to: '/audit', label: 'Audit Trail', icon: ClipboardList, can: 'always', keywords: 'activity who changed what' },
    ],
  },
  {
    label: 'NOC Operations',
    can: 'canAccessNOC',
    items: [
      { to: '/noc/operations', label: 'Operations', icon: Activity, can: 'canAccessNOC' },
      { to: '/noc/alerts', label: 'Fault Monitoring', icon: Siren, can: 'canAccessNOC', keywords: 'alarm incident' },
      { to: '/noc/provisioning', label: 'Provisioning', icon: Layers, can: 'canAccessNOC' },
      { to: '/noc/instances', label: 'VyOS Instances', icon: Server, can: 'canAccessNOC', keywords: 'gateway bng' },
      { to: '/noc/router-proposals', label: 'Router Proposals', icon: Router, can: 'canAccessNOC' },
      { to: '/noc/change-requests', label: 'Change Requests', icon: GitPullRequest, can: 'canAccessNOC' },
      { to: '/noc/registrations', label: 'Registrations', icon: UserCheck, can: 'canAccessNOC' },
      { to: '/noc/analytics', label: 'Analytics & Logs', icon: LineChart, can: 'canAccessNOC' },
      { to: '/capacity', label: 'Capacity Planning', icon: Gauge, can: 'canAccessNOC', keywords: 'forecast growth bandwidth' },
    ],
  },
  {
    label: 'EB Management',
    can: 'canAccessEB',
    items: [
      { to: '/eb', label: 'EB Dashboard', icon: Airplay, can: 'canAccessEB' },
      { to: '/eb/change-requests', label: 'Change Requests', icon: GitPullRequest, can: 'canAccessEB' },
      { to: '/eb/customers', label: 'EB Customers', icon: Building, can: 'canAccessEB' },
    ],
  },
  {
    label: 'Administration',
    can: 'canManageUsers',
    items: [
      { to: '/users', label: 'All Users', icon: User, can: 'canManageUsers' },
      { to: '/users/create', label: 'Create User', icon: UserPlus, can: 'canManageUsers' },
    ],
  },
  {
    label: 'Workspace',
    can: 'always',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings, can: 'always', keywords: 'preferences notifications api keys' },
      { to: '/profile', label: 'Profile', icon: Network, can: 'always', keywords: 'account password' },
    ],
  },
]

/** Flattened list for the command palette + breadcrumbs. */
export const NAV_INDEX = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })))

export function labelForPath(path: string): string | undefined {
  return NAV_INDEX.find((i) => i.to === path)?.label
}

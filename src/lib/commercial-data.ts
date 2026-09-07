/**
 * Deterministic presentation data for the commercial admin screens.
 * No API exists for these surfaces yet; values are stable across renders
 * so layouts and interactions can be validated reliably.
 */

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const CIRCLES = ['Assam', 'Kolkata', 'Chennai', 'Mumbai', 'Delhi', 'Kerala', 'Gujarat', 'Punjab']
const VENUES = ['Railway Station', 'Bus Terminal', 'City Mall', 'District Hospital', 'University Campus', 'Airport T2', 'Municipal Office', 'Market Square']

export interface Hotspot {
  id: string
  name: string
  circle: string
  ssid: string
  status: 'online' | 'offline' | 'degraded'
  clients: number
  uptime: number
  utilisation: number
  firmware: string
  lastSeen: string
}

export const HOTSPOTS: Hotspot[] = Array.from({ length: 28 }, (_, i) => {
  const r = rng(i + 11)
  const roll = r()
  const status: Hotspot['status'] = roll > 0.86 ? 'offline' : roll > 0.72 ? 'degraded' : 'online'
  return {
    id: `AP-${(1400 + i * 7).toString()}`,
    name: `${VENUES[i % VENUES.length]} ${Math.floor(i / VENUES.length) + 1}`,
    circle: CIRCLES[i % CIRCLES.length],
    ssid: i % 3 === 0 ? 'BSNL-WiFi' : 'BSNL-WANI',
    status,
    clients: status === 'offline' ? 0 : Math.floor(r() * 180) + 4,
    uptime: Number((97 + r() * 3).toFixed(2)),
    utilisation: Math.floor(r() * 96),
    firmware: `v${3 + (i % 2)}.${i % 9}.${i % 5}`,
    lastSeen: status === 'offline' ? `${1 + (i % 9)}h ago` : `${1 + (i % 50)}s ago`,
  }
})

export interface Voucher {
  code: string
  batch: string
  plan: string
  status: 'unused' | 'active' | 'redeemed' | 'expired'
  value: number
  issuedTo: string
  createdAt: string
  expiresAt: string
}

const PLAN_NAMES = ['Starter 1h', 'Day Pass', 'Weekly 5GB', 'Monthly Unlimited', 'Event 3h']

export const VOUCHERS: Voucher[] = Array.from({ length: 30 }, (_, i) => {
  const r = rng(i + 91)
  const roll = r()
  const status: Voucher['status'] = roll > 0.85 ? 'expired' : roll > 0.6 ? 'redeemed' : roll > 0.3 ? 'active' : 'unused'
  return {
    code: `WANI-${(i * 3719 + 100000).toString().slice(0, 6)}`,
    batch: `BATCH-${2026}-${String((i % 6) + 1).padStart(2, '0')}`,
    plan: PLAN_NAMES[i % PLAN_NAMES.length],
    status,
    value: [20, 49, 99, 249, 149][i % 5],
    issuedTo: ['Retail counter', 'Reseller: Nova Net', 'Event desk', 'Kiosk', 'Reseller: SkyLink'][i % 5],
    createdAt: `2026-0${(i % 8) + 1}-${String((i % 27) + 1).padStart(2, '0')}`,
    expiresAt: `2026-1${(i % 2) + 1}-${String((i % 27) + 1).padStart(2, '0')}`,
  }
})

export interface Plan {
  id: string
  name: string
  price: number
  speed: string
  fup: string
  validity: string
  devices: number
  subscribers: number
  revenue: number
  status: 'active' | 'draft' | 'suspended'
  featured?: boolean
}

export const PLANS: Plan[] = [
  { id: 'p1', name: 'Starter 1h', price: 20, speed: '4 Mbps', fup: '1 GB', validity: '1 hour', devices: 1, subscribers: 12480, revenue: 249600, status: 'active' },
  { id: 'p2', name: 'Day Pass', price: 49, speed: '10 Mbps', fup: '5 GB', validity: '24 hours', devices: 2, subscribers: 8420, revenue: 412580, status: 'active', featured: true },
  { id: 'p3', name: 'Weekly 5GB', price: 99, speed: '20 Mbps', fup: '15 GB', validity: '7 days', devices: 3, subscribers: 3190, revenue: 315810, status: 'active' },
  { id: 'p4', name: 'Monthly Unlimited', price: 249, speed: '30 Mbps', fup: 'Unlimited', validity: '30 days', devices: 4, subscribers: 1870, revenue: 465630, status: 'active' },
  { id: 'p5', name: 'Event 3h', price: 149, speed: '25 Mbps', fup: '10 GB', validity: '3 hours', devices: 5, subscribers: 240, revenue: 35760, status: 'draft' },
  { id: 'p6', name: 'Campus Term', price: 799, speed: '50 Mbps', fup: 'Unlimited', validity: '90 days', devices: 5, subscribers: 610, revenue: 487390, status: 'suspended' },
]

export interface PortalProfile {
  id: string
  name: string
  scope: string
  status: 'published' | 'draft'
  accent: string
  headline: string
  subline: string
  authMethods: string[]
  updated: string
}

export const PORTAL_PROFILES: PortalProfile[] = [
  { id: 'default', name: 'BSNL National', scope: 'All circles', status: 'published', accent: '#1e6fd9', headline: 'Welcome to BSNL Wi-Fi', subline: 'Verify your mobile number to get online.', authMethods: ['OTP', 'Voucher'], updated: '2 days ago' },
  { id: 'assam', name: 'Assam Transit', scope: 'Assam circle', status: 'draft', accent: '#0f9d6e', headline: 'Free Wi-Fi at every station', subline: 'Sign in with OTP. PM-WANI compliant.', authMethods: ['OTP'], updated: '5 hours ago' },
  { id: 'campus', name: 'Campus Edition', scope: 'Universities', status: 'published', accent: '#7c3aed', headline: 'Campus Wi-Fi', subline: 'Use your student ID to connect.', authMethods: ['OTP', 'RADIUS', 'Voucher'], updated: '1 week ago' },
]

export interface NasClient {
  name: string
  ip: string
  type: string
  status: 'healthy' | 'degraded' | 'offline'
  authRate: number
  rejects: number
  accounting: 'active' | 'idle' | 'failed'
}

export const NAS_CLIENTS: NasClient[] = [
  { name: 'gw-assam-01', ip: '10.21.4.10', type: 'VyOS BNG', status: 'healthy', authRate: 412, rejects: 6, accounting: 'active' },
  { name: 'gw-assam-02', ip: '10.21.4.11', type: 'VyOS BNG', status: 'healthy', authRate: 388, rejects: 3, accounting: 'active' },
  { name: 'gw-kol-01', ip: '10.24.7.10', type: 'Mikrotik CHR', status: 'degraded', authRate: 154, rejects: 41, accounting: 'idle' },
  { name: 'gw-chn-01', ip: '10.28.2.10', type: 'VyOS BNG', status: 'healthy', authRate: 501, rejects: 9, accounting: 'active' },
  { name: 'gw-mum-03', ip: '10.31.9.14', type: 'Cisco WLC', status: 'offline', authRate: 0, rejects: 0, accounting: 'failed' },
]

export const AAA_REQUESTS = Array.from({ length: 12 }, (_, i) => {
  const r = rng(i + 501)
  const ok = r() > 0.22
  return {
    id: `req-${i}`,
    time: `17:${String(59 - i * 3).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
    user: `9${(700000000 + i * 13571).toString().slice(0, 9)}`,
    nas: NAS_CLIENTS[i % NAS_CLIENTS.length].name,
    result: ok ? 'Access-Accept' : 'Access-Reject',
    reason: ok ? 'OTP verified' : ['Bad credentials', 'Plan expired', 'Quota exceeded'][i % 3],
  }
})

export interface Tenant {
  id: string
  name: string
  type: 'Reseller' | 'Franchise' | 'Enterprise'
  circle: string
  sites: number
  subscribers: number
  creditBalance: number
  monthlyRevenue: number
  status: 'active' | 'pending' | 'suspended'
}

export const TENANTS: Tenant[] = [
  { id: 't1', name: 'Nova Net Services', type: 'Reseller', circle: 'Assam', sites: 42, subscribers: 6120, creditBalance: 84200, monthlyRevenue: 312000, status: 'active' },
  { id: 't2', name: 'SkyLink Broadband', type: 'Reseller', circle: 'Kolkata', sites: 28, subscribers: 3980, creditBalance: 12400, monthlyRevenue: 187500, status: 'active' },
  { id: 't3', name: 'Metro Connect', type: 'Franchise', circle: 'Mumbai', sites: 61, subscribers: 10240, creditBalance: -8600, monthlyRevenue: 498000, status: 'suspended' },
  { id: 't4', name: 'Coastal Wireless', type: 'Reseller', circle: 'Kerala', sites: 17, subscribers: 2140, creditBalance: 39000, monthlyRevenue: 96500, status: 'active' },
  { id: 't5', name: 'Vidya Campus Group', type: 'Enterprise', circle: 'Chennai', sites: 9, subscribers: 8600, creditBalance: 152000, monthlyRevenue: 274000, status: 'pending' },
]

export interface Invoice {
  id: string
  account: string
  period: string
  amount: number
  tax: number
  status: 'paid' | 'due' | 'overdue' | 'draft'
  issued: string
  dueDate: string
  ageDays: number
}

export const INVOICES: Invoice[] = Array.from({ length: 18 }, (_, i) => {
  const r = rng(i + 301)
  const roll = r()
  const status: Invoice['status'] = roll > 0.82 ? 'overdue' : roll > 0.6 ? 'due' : roll > 0.12 ? 'paid' : 'draft'
  const amount = Math.round((8000 + r() * 240000) / 100) * 100
  return {
    id: `INV-2026-${String(1041 + i).padStart(4, '0')}`,
    account: TENANTS[i % TENANTS.length].name,
    period: `Aug 2026`,
    amount,
    tax: Math.round(amount * 0.18),
    status,
    issued: `2026-09-0${(i % 9) + 1}`,
    dueDate: `2026-09-${String(15 + (i % 14)).padStart(2, '0')}`,
    ageDays: status === 'overdue' ? 15 + (i % 45) : i % 12,
  }
})

export interface ReportDef {
  id: string
  name: string
  category: 'Usage' | 'Revenue' | 'Compliance' | 'Network'
  description: string
  lastRun: string
  format: string
  schedule?: string
}

export const REPORTS: ReportDef[] = [
  { id: 'r1', name: 'Daily Session Summary', category: 'Usage', description: 'Sessions, unique users, data volume per hotspot.', lastRun: 'Today 06:00', format: 'CSV', schedule: 'Daily 06:00 IST' },
  { id: 'r2', name: 'Voucher Redemption', category: 'Revenue', description: 'Issued vs redeemed vouchers by batch and reseller.', lastRun: 'Yesterday 23:10', format: 'XLSX', schedule: 'Weekly Mon' },
  { id: 'r3', name: 'PM-WANI Compliance Pack', category: 'Compliance', description: 'PDO/PDOA registry, KYC counts and retention proof.', lastRun: '2 days ago', format: 'PDF', schedule: 'Monthly 1st' },
  { id: 'r4', name: 'AP Uptime & SLA', category: 'Network', description: 'Availability per access point against SLA targets.', lastRun: 'Today 07:30', format: 'CSV' },
  { id: 'r5', name: 'Reseller Settlement', category: 'Revenue', description: 'Commission, credits and settlements per tenant.', lastRun: '3 days ago', format: 'XLSX', schedule: 'Monthly 3rd' },
  { id: 'r6', name: 'IPDR Export', category: 'Compliance', description: 'Lawful-intercept ready records for a given case.', lastRun: '1 week ago', format: 'CSV' },
  { id: 'r7', name: 'Bandwidth Peaks', category: 'Network', description: 'Peak concurrent clients and throughput per circle.', lastRun: 'Today 08:00', format: 'CSV' },
  { id: 'r8', name: 'Churn & Retention', category: 'Usage', description: 'Repeat users, churn cohort and plan migration.', lastRun: '4 days ago', format: 'XLSX' },
]

export const REPORT_RUNS = [
  { id: 'run1', report: 'Daily Session Summary', started: 'Today 06:00', duration: '48s', rows: 128_400, status: 'paid' },
  { id: 'run2', report: 'AP Uptime & SLA', started: 'Today 07:30', duration: '1m 12s', rows: 2_840, status: 'paid' },
  { id: 'run3', report: 'Bandwidth Peaks', started: 'Today 08:00', duration: '22s', rows: 960, status: 'paid' },
  { id: 'run4', report: 'Voucher Redemption', started: 'Yesterday 23:10', duration: '2m 04s', rows: 41_220, status: 'paid' },
  { id: 'run5', report: 'IPDR Export', started: '1 week ago', duration: '—', rows: 0, status: 'failed' },
]

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ShieldAlert,
  Search,
  Download,
  AlertTriangle,
  Clock,
  User,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight,
  RefreshCw,
  UserCheck,
  History,
  Activity,
  HardDrive,
  Globe,
  Radio,
  Building2,
  FileSpreadsheet,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { ipdrApi } from '@/api/ipdr'
import { extractErrorMessage } from '@/lib/axios'
import type {
  NATFlowRecord,
  SubscriberIdentityProfile,
  HistoricalSessionRecord,
  CorrelationStatus,
} from '@/types'

// Helper to format ISO strings for datetime-local inputs
function toDateTimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const Y = date.getFullYear()
  const M = pad(date.getMonth() + 1)
  const D = pad(date.getDate())
  const h = pad(date.getHours())
  const m = pad(date.getMinutes())
  return `${Y}-${M}-${D}T${h}:${m}`
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts.endsWith('Z') ? ts : `${ts}Z`)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ts
  }
}

function renderCorrelationStatusBadge(status?: CorrelationStatus | string | null) {
  switch (status) {
    case 'exact':
      return <Badge label="EXACT MATCH" variant="success" />
    case 'multiple_matches':
      return <Badge label="AMBIGUOUS (MULTIPLE)" variant="warning" />
    case 'expired_session':
      return <Badge label="EXPIRED SESSION" variant="info" />
    case 'missing_router_scope':
      return <Badge label="CROSS-ROUTER" variant="warning" />
    case 'data_incomplete':
      return <Badge label="INCOMPLETE DATA" variant="danger" />
    case 'no_match':
    default:
      return <Badge label="UNMATCHED" variant="default" />
  }
}

export function IPDRCompliancePage() {
  const [activeTab, setActiveTab] = useState<'subscriber_search' | 'subscriber_trace' | 'reverse_nat'>('subscriber_search')

  // ── Tab 1: Subscriber Search State (Task 5.5) ──────────────────────────
  const [searchField, setSearchField] = useState<string>('all')
  const [searchQueryText, setSearchQueryText] = useState<string>('')
  const [searchSubPage, setSearchSubPage] = useState(1)
  const [activeSearchFilter, setActiveSearchFilter] = useState<{
    field: string
    query: string
    page: number
  } | null>(null)

  const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberIdentityProfile | null>(null)
  const [sessionPage, setSessionPage] = useState(1)
  const [selectedSessionForFlows, setSelectedSessionForFlows] = useState<HistoricalSessionRecord | null>(null)
  const [sessionFlowPage, setSessionFlowPage] = useState(1)

  // ── Tab 2: Private IP Trace State ──────────────────────────────────────
  const now = new Date()
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000)

  const [subSourceIp, setSubSourceIp] = useState('10.99.99.2')
  const [subTimeFrom, setSubTimeFrom] = useState(toDateTimeLocalString(yesterday))
  const [subTimeTo, setSubTimeTo] = useState(toDateTimeLocalString(now))
  const [subPage, setSubPage] = useState(1)
  const [subPageSize, setSubPageSize] = useState(50)
  const [activeSubQuery, setActiveSubQuery] = useState<{
    source_ip: string
    time_from: string
    time_to: string
    page: number
    page_size: number
  } | null>(null)

  // ── Tab 3: Reverse NAT State ───────────────────────────────────────────
  const [revPublicIp, setRevPublicIp] = useState('10.44.0.229')
  const [revNatPort, setRevNatPort] = useState('51362')
  const [revTimestamp, setRevTimestamp] = useState(toDateTimeLocalString(now))
  const [revTolerance, setRevTolerance] = useState('0')
  const [activeRevQuery, setActiveRevQuery] = useState<{
    public_ip: string
    nat_port: number
    timestamp: string
    time_tolerance_seconds: number
  } | null>(null)

  // ── Modal & Inspector State ───────────────────────────────────────────
  const [selectedRecord, setSelectedRecord] = useState<NATFlowRecord | null>(null)
  const [copiedEventId, setCopiedEventId] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // ── Queries ────────────────────────────────────────────────────────────

  // 1. Subscriber multi-identifier search query
  const subscriberSearchQuery = useQuery({
    queryKey: ['ipdr', 'subscribers-search', activeSearchFilter],
    queryFn: () => {
      if (!activeSearchFilter || !activeSearchFilter.query.trim()) return null
      const q = activeSearchFilter.query.trim()
      const f = activeSearchFilter.field
      return ipdrApi.searchSubscribers({
        query: f === 'all' ? q : undefined,
        username: f === 'username' ? q : undefined,
        phone: f === 'phone' ? q : undefined,
        email: f === 'email' ? q : undefined,
        mac_address: f === 'mac_address' ? q : undefined,
        session_id: f === 'session_id' ? q : undefined,
        customer_name: f === 'customer_name' ? q : undefined,
        ip_address: f === 'ip_address' ? q : undefined,
        page: activeSearchFilter.page,
        page_size: 10,
      })
    },
    enabled: !!activeSearchFilter && activeTab === 'subscriber_search',
  })

  // 2. Selected Subscriber's Historical Sessions query
  const subscriberSessionsQuery = useQuery({
    queryKey: ['ipdr', 'subscriber-sessions', selectedSubscriber?.user_id, sessionPage],
    queryFn: () => {
      if (!selectedSubscriber) return null
      return ipdrApi.getSubscriberSessions(selectedSubscriber.user_id, {
        page: sessionPage,
        page_size: 10,
      })
    },
    enabled: !!selectedSubscriber && activeTab === 'subscriber_search',
  })

  // 3. Drilldown: Session NAT Flows query
  const sessionFlowsQuery = useQuery({
    queryKey: ['ipdr', 'session-flows', selectedSubscriber?.user_id, selectedSessionForFlows?.session_id, sessionFlowPage],
    queryFn: () => {
      if (!selectedSubscriber || !selectedSessionForFlows) return null
      return ipdrApi.getSubscriberSessionFlows(
        selectedSubscriber.user_id,
        selectedSessionForFlows.session_id,
        {
          page: sessionFlowPage,
          page_size: 50,
        },
      )
    },
    enabled: !!selectedSubscriber && !!selectedSessionForFlows && activeTab === 'subscriber_search',
  })

  // 4. Private IP Lookup Query
  const subscriberTraceQuery = useQuery({
    queryKey: ['ipdr', 'subscriber-lookup', activeSubQuery],
    queryFn: () => {
      if (!activeSubQuery) return null
      return ipdrApi.subscriberLookup({
        source_ip: activeSubQuery.source_ip,
        time_from: new Date(activeSubQuery.time_from).toISOString(),
        time_to: new Date(activeSubQuery.time_to).toISOString(),
        page: activeSubQuery.page,
        page_size: activeSubQuery.page_size,
      })
    },
    enabled: !!activeSubQuery && activeTab === 'subscriber_trace',
  })

  // 5. Reverse NAT Query
  const reverseNatQuery = useQuery({
    queryKey: ['ipdr', 'reverse-nat-lookup', activeRevQuery],
    queryFn: () => {
      if (!activeRevQuery) return null
      return ipdrApi.reverseNatLookup({
        public_ip: activeRevQuery.public_ip,
        nat_port: activeRevQuery.nat_port,
        timestamp: new Date(activeRevQuery.timestamp).toISOString(),
        time_tolerance_seconds: activeRevQuery.time_tolerance_seconds,
      })
    },
    enabled: !!activeRevQuery && activeTab === 'reverse_nat',
  })

  // ── Form Handlers ──────────────────────────────────────────────────────

  const handleSubscriberSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQueryText.trim()) {
      toast.error('Please enter a search query (e.g. username, mobile, MAC, or session ID)')
      return
    }
    setSearchSubPage(1)
    setSelectedSubscriber(null)
    setSelectedSessionForFlows(null)
    setActiveSearchFilter({
      field: searchField,
      query: searchQueryText.trim(),
      page: 1,
    })
  }

  const handleSelectSubscriber = (sub: SubscriberIdentityProfile) => {
    setSelectedSubscriber(sub)
    setSessionPage(1)
    setSelectedSessionForFlows(null)
  }

  const handleInvestigateSessionFlows = (session: HistoricalSessionRecord) => {
    setSelectedSessionForFlows(session)
    setSessionFlowPage(1)
    toast.success(`Investigating NAT flows for session ${session.session_id.substring(0, 8)}...`)
  }

  const handleSubscriberTraceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ip = subSourceIp.trim()
    if (!ip) {
      toast.error('Please enter a valid Source IP address')
      return
    }
    const tFrom = new Date(subTimeFrom)
    const tTo = new Date(subTimeTo)
    if (isNaN(tFrom.getTime()) || isNaN(tTo.getTime())) {
      toast.error('Please provide valid start and end timestamps')
      return
    }
    if (tFrom >= tTo) {
      toast.error('Start time must precede end time')
      return
    }
    const daysDiff = (tTo.getTime() - tFrom.getTime()) / (1000 * 3600 * 24)
    if (daysDiff > 90) {
      toast.error('Search time range cannot exceed 90 days')
      return
    }

    setSubPage(1)
    setActiveSubQuery({
      source_ip: ip,
      time_from: subTimeFrom,
      time_to: subTimeTo,
      page: 1,
      page_size: subPageSize,
    })
  }

  const handleReverseNatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ip = revPublicIp.trim()
    const port = parseInt(revNatPort.trim(), 10)
    if (!ip) {
      toast.error('Please enter a valid Public IP address')
      return
    }
    if (isNaN(port) || port < 1 || port > 65535) {
      toast.error('NAT Port must be between 1 and 65535')
      return
    }
    const ts = new Date(revTimestamp)
    if (isNaN(ts.getTime())) {
      toast.error('Please provide a valid incident timestamp')
      return
    }
    if (ts > new Date()) {
      toast.error('Incident timestamp cannot be in the future')
      return
    }

    setActiveRevQuery({
      public_ip: ip,
      nat_port: port,
      timestamp: revTimestamp,
      time_tolerance_seconds: parseInt(revTolerance, 10) || 0,
    })
  }

  const handleExportCsv = async (sourceIp: string, timeFrom: string, timeTo: string) => {
    try {
      setIsExporting(true)
      const blob = await ipdrApi.downloadCsv({
        source_ip: sourceIp,
        time_from: new Date(timeFrom).toISOString(),
        time_to: new Date(timeTo).toISOString(),
        limit: 100000,
      })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ipdr_export_${sourceIp.replace(/:/g, '_')}_${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('IPDR CSV exported successfully')
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to export CSV'))
    } finally {
      setIsExporting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEventId(true)
    setTimeout(() => setCopiedEventId(false), 2000)
    toast.success('Copied to clipboard')
  }

  const setPresetRange = (hours: number) => {
    const end = new Date()
    const start = new Date(Date.now() - hours * 3600 * 1000)
    setSubTimeFrom(toDateTimeLocalString(start))
    setSubTimeTo(toDateTimeLocalString(end))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="IPDR Regulatory Compliance & LEA Trace"
        description="DoT-compliant temporal subscriber identity correlation, reverse-NAT traceback, and ClickHouse NAT log investigation."
      />

      {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('subscriber_search')}
            className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center space-x-2 transition-colors ${
              activeTab === 'subscriber_search'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Subscriber / Account Search</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full font-semibold">
              Task 5.5
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscriber_trace')}
            className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center space-x-2 transition-colors ${
              activeTab === 'subscriber_trace'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Subscriber IPDR Trace</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reverse_nat')}
            className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center space-x-2 transition-colors ${
              activeTab === 'reverse_nat'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Law Enforcement Reverse NAT Trace (LEA)</span>
          </button>
        </nav>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: SUBSCRIBER / ACCOUNT SEARCH (Task 5.5)                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'subscriber_search' && (
        <div className="space-y-6">
          {/* Search Form Card */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Subscriber Investigation Search</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Search by subscriber username, mobile/MSISDN, email, MAC address, session UUID, customer account, or assigned private IP.
            </p>

            <form onSubmit={handleSubscriberSearchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Search Identifier Mode
                  </label>
                  <select
                    value={searchField}
                    onChange={(e) => setSearchField(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  >
                    <option value="all">All Identifiers (Smart Match)</option>
                    <option value="username">Username</option>
                    <option value="phone">Mobile / MSISDN</option>
                    <option value="email">Email Address</option>
                    <option value="mac_address">MAC Address</option>
                    <option value="session_id">Session UUID</option>
                    <option value="customer_name">Customer Account Name</option>
                    <option value="ip_address">Private IP Address</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Query Term / Identifier
                  </label>
                  <input
                    type="text"
                    value={searchQueryText}
                    onChange={(e) => setSearchQueryText(e.target.value)}
                    placeholder="e.g. 9876543210, user_alice, aa:bb:cc:dd:ee:01, or BSNL Enterprise..."
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={subscriberSearchQuery.isLoading}
                  >
                    {subscriberSearchQuery.isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span>Find Subscribers</span>
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          {/* Search Results List */}
          {activeSearchFilter && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Matching Subscribers ({subscriberSearchQuery.data?.total ?? 0})
                </h3>
                {subscriberSearchQuery.isFetching && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Searching captive database...
                  </span>
                )}
              </div>

              {subscriberSearchQuery.data && subscriberSearchQuery.data.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subscriberSearchQuery.data.items.map((sub) => {
                    const isSelected = selectedSubscriber?.user_id === sub.user_id
                    return (
                      <Card
                        key={sub.user_id}
                        className={`p-5 cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                            : 'hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                        onClick={() => handleSelectSubscriber(sub)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white text-base">
                                {sub.username}
                              </span>
                              <Badge
                                label={sub.active_sessions > 0 ? 'ONLINE' : 'OFFLINE'}
                                variant={sub.active_sessions > 0 ? 'success' : 'default'}
                              />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {sub.full_name || 'Subscriber Account'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={isSelected ? 'primary' : 'secondary'}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectSubscriber(sub)
                            }}
                          >
                            {isSelected ? 'Selected' : 'View Sessions'}
                          </Button>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block">Mobile:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{sub.phone || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block">Customer:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">
                              {sub.customer_name || 'Individual'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block">Total Sessions:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{sub.total_sessions}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block">Last Seen IP:</span>
                            <span className="font-mono text-gray-800 dark:text-gray-200">{sub.last_seen_ip || '—'}</span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                !subscriberSearchQuery.isLoading && (
                  <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <User className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="font-medium">No subscribers found matching your query</p>
                    <p className="text-xs text-gray-400 mt-1">Try expanding the query or choosing "All Identifiers"</p>
                  </Card>
                )
              )}
            </div>
          )}

          {/* Selected Subscriber Details & Historical Sessions */}
          {selectedSubscriber && (
            <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              {/* Profile Brief */}
              <Card className="p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-indigo-200 dark:border-indigo-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-lg">
                      {selectedSubscriber.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {selectedSubscriber.username}
                        <span className="text-xs font-normal text-gray-500 font-mono">
                          (UID: {selectedSubscriber.user_id})
                        </span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-300 mt-1">
                        <span><strong>Phone:</strong> {selectedSubscriber.phone || '—'}</span>
                        <span><strong>Email:</strong> {selectedSubscriber.email || '—'}</span>
                        <span><strong>Customer:</strong> {selectedSubscriber.customer_name || 'Individual'}</span>
                        <span><strong>Router:</strong> {selectedSubscriber.router_name || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <span className="text-gray-500 block">Total Historical Sessions</span>
                      <span className="font-bold text-gray-900 dark:text-white text-base">
                        {selectedSubscriber.total_sessions}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sessions Timeline Table */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Historical Sessions & IP Assignments</span>
                  </h4>
                  <span className="text-xs text-gray-500">
                    Click "Investigate NAT Events" to query ClickHouse NAT flows during that lease.
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Session UUID</Th>
                        <Th>Assigned Private IP</Th>
                        <Th>Client MAC</Th>
                        <Th>Started At</Th>
                        <Th>Ended / Expires</Th>
                        <Th>Router</Th>
                        <Th>Data Volume</Th>
                        <Th>Status</Th>
                        <Th className="text-right">Action</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriberSessionsQuery.data && subscriberSessionsQuery.data.items.length > 0 ? (
                        subscriberSessionsQuery.data.items.map((sess) => {
                          const isDrilled = selectedSessionForFlows?.session_id === sess.session_id
                          return (
                            <tr
                              key={sess.session_id}
                              className={isDrilled ? 'bg-indigo-50 dark:bg-indigo-950/30' : undefined}
                            >
                              <Td className="font-mono text-xs">{sess.session_id.substring(0, 13)}...</Td>
                              <Td className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                {sess.ip_address}
                              </Td>
                              <Td className="font-mono text-xs">{sess.mac_address}</Td>
                              <Td className="text-xs">{formatTimestamp(sess.started_at)}</Td>
                              <Td className="text-xs">
                                {sess.ended_at ? formatTimestamp(sess.ended_at) : formatTimestamp(sess.expires_at)}
                              </Td>
                              <Td className="text-xs">{sess.router_name || `Router #${sess.vyos_instance_id}`}</Td>
                              <Td className="text-xs">
                                {formatBytes(sess.bytes_in + sess.bytes_out)}
                              </Td>
                              <Td>
                                <Badge
                                  label={sess.is_active ? 'ACTIVE' : 'CLOSED'}
                                  variant={sess.is_active ? 'success' : 'default'}
                                />
                              </Td>
                              <Td className="text-right">
                                <Button
                                  size="sm"
                                  variant={isDrilled ? 'primary' : 'secondary'}
                                  className="text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
                                  onClick={() => handleInvestigateSessionFlows(sess)}
                                >
                                  <span>Inspect NAT Events</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </Td>
                            </tr>
                          )
                        })
                      ) : (
                        <EmptyRow
                          cols={9}
                          message={subscriberSessionsQuery.isLoading ? 'Loading sessions...' : 'No historical sessions recorded'}
                        />
                      )}
                    </tbody>
                  </Table>
                </div>

                {/* Session Pagination */}
                {subscriberSessionsQuery.data && subscriberSessionsQuery.data.total_pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-500">
                      Page {sessionPage} of {subscriberSessionsQuery.data.total_pages} ({subscriberSessionsQuery.data.total} sessions)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={sessionPage <= 1}
                        onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={sessionPage >= subscriberSessionsQuery.data.total_pages}
                        onClick={() => setSessionPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Drilldown NAT Flow Results Table */}
              {selectedSessionForFlows && (
                <Card className="p-6 border-2 border-indigo-400 dark:border-indigo-600">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <span>NAT Flow Evidence for Session: {selectedSessionForFlows.session_id}</span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Private IP: <strong className="font-mono">{selectedSessionForFlows.ip_address}</strong> | Time Window: {formatTimestamp(selectedSessionForFlows.started_at)} &rarr; {formatTimestamp(selectedSessionForFlows.ended_at || selectedSessionForFlows.expires_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleExportCsv(
                            selectedSessionForFlows.ip_address,
                            selectedSessionForFlows.started_at,
                            selectedSessionForFlows.ended_at || selectedSessionForFlows.expires_at,
                          )
                        }
                        disabled={isExporting}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export CSV</span>
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <thead>
                        <tr>
                          <Th>Flow Start (UTC)</Th>
                          <Th>Source (Private)</Th>
                          <Th>Public / Translated</Th>
                          <Th>Destination</Th>
                          <Th>Proto</Th>
                          <Th>Data Volume</Th>
                          <Th>Attribution</Th>
                          <Th className="text-right">Action</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionFlowsQuery.data && sessionFlowsQuery.data.items.length > 0 ? (
                          sessionFlowsQuery.data.items.map((flow) => (
                            <tr
                              key={flow.event_id}
                              onClick={() => setSelectedRecord(flow)}
                              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                              <Td className="font-mono text-xs">{formatTimestamp(flow.flow_start)}</Td>
                              <Td className="font-mono text-xs font-semibold">
                                {flow.source_ip}:{flow.source_port}
                              </Td>
                              <Td className="font-mono text-xs">
                                {flow.public_ip}:{flow.nat_port}
                              </Td>
                              <Td className="font-mono text-xs">
                                {flow.dest_ip}:{flow.dest_port}
                              </Td>
                              <Td>
                                <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                  {flow.protocol_name}
                                </span>
                              </Td>
                              <Td className="text-xs">
                                {formatBytes(flow.bytes_orig + flow.bytes_reply)}
                              </Td>
                              <Td>{renderCorrelationStatusBadge(flow.correlation?.status || flow.subscriber?.status)}</Td>
                              <Td className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedRecord(flow)
                                  }}
                                >
                                  Inspect
                                </Button>
                              </Td>
                            </tr>
                          ))
                        ) : (
                          <EmptyRow
                            cols={8}
                            message={sessionFlowsQuery.isLoading ? 'Querying ClickHouse NAT flows...' : 'No NAT flows recorded for this session interval'}
                          />
                        )}
                      </tbody>
                    </Table>
                  </div>

                  {/* Flow Pagination */}
                  {sessionFlowsQuery.data && sessionFlowsQuery.data.total_pages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-xs text-gray-500">
                        Page {sessionFlowPage} of {sessionFlowsQuery.data.total_pages} ({sessionFlowsQuery.data.total} total flows)
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={sessionFlowPage <= 1}
                          onClick={() => setSessionFlowPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={sessionFlowPage >= sessionFlowsQuery.data.total_pages}
                          onClick={() => setSessionFlowPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: PRIVATE IP TRACE (Direct Query)                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'subscriber_trace' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Direct Private IP Trace</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Query ClickHouse NAT events by private subscriber IP address and specific time window.
            </p>

            <form onSubmit={handleSubscriberTraceSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Subscriber Source IP (Private)
                  </label>
                  <input
                    type="text"
                    value={subSourceIp}
                    onChange={(e) => setSubSourceIp(e.target.value)}
                    placeholder="10.99.99.2"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Time From (Local)
                  </label>
                  <input
                    type="datetime-local"
                    value={subTimeFrom}
                    onChange={(e) => setSubTimeFrom(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Time To (Local)
                  </label>
                  <input
                    type="datetime-local"
                    value={subTimeTo}
                    onChange={(e) => setSubTimeTo(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Time Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => setPresetRange(1)}
                    className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    1h
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetRange(6)}
                    className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    6h
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetRange(24)}
                    className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    24h
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetRange(168)}
                    className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    7d
                  </button>
                </div>

                <Button type="submit" disabled={subscriberTraceQuery.isLoading} className="inline-flex items-center gap-2">
                  {subscriberTraceQuery.isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>Query IPDR Records</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Results Table */}
          {activeSubQuery && (
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Flow Records for {activeSubQuery.source_ip}</span>
                    <Badge label={`${subscriberTraceQuery.data?.total ?? 0} Total Events`} variant="default" />
                  </h3>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleExportCsv(activeSubQuery.source_ip, activeSubQuery.time_from, activeSubQuery.time_to)}
                  disabled={isExporting || !subscriberTraceQuery.data?.total}
                  className="inline-flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Full CSV</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Flow Start</Th>
                      <Th>Source (Private)</Th>
                      <Th>Public / Translated</Th>
                      <Th>Destination</Th>
                      <Th>Proto</Th>
                      <Th>Volume</Th>
                      <Th>Subscriber</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriberTraceQuery.data && subscriberTraceQuery.data.items.length > 0 ? (
                      subscriberTraceQuery.data.items.map((flow) => (
                        <tr
                          key={flow.event_id}
                          onClick={() => setSelectedRecord(flow)}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <Td className="font-mono text-xs">{formatTimestamp(flow.flow_start)}</Td>
                          <Td className="font-mono text-xs font-semibold">{flow.source_ip}:{flow.source_port}</Td>
                          <Td className="font-mono text-xs">{flow.public_ip}:{flow.nat_port}</Td>
                          <Td className="font-mono text-xs">{flow.dest_ip}:{flow.dest_port}</Td>
                          <Td><span className="font-bold text-xs">{flow.protocol_name}</span></Td>
                          <Td className="text-xs">{formatBytes(flow.bytes_orig + flow.bytes_reply)}</Td>
                          <Td className="text-xs">{flow.correlation?.username || flow.subscriber?.username || '—'}</Td>
                          <Td>{renderCorrelationStatusBadge(flow.correlation?.status || flow.subscriber?.status)}</Td>
                          <Td className="text-right">
                            <Button size="sm" variant="ghost" className="text-xs" onClick={(e) => { e.stopPropagation(); setSelectedRecord(flow); }}>
                              Inspect
                            </Button>
                          </Td>
                        </tr>
                      ))
                    ) : (
                      <EmptyRow cols={9} message={subscriberTraceQuery.isLoading ? 'Querying ClickHouse...' : 'No flow records found'} />
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: REVERSE NAT TRACE (LEA)                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reverse_nat' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>LEA Reverse-NAT Traceback</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Identify the subscriber behind an external post-NAT public IP and public port at an exact incident timestamp.
            </p>

            <form onSubmit={handleReverseNatSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Public NAT IP
                  </label>
                  <input
                    type="text"
                    value={revPublicIp}
                    onChange={(e) => setRevPublicIp(e.target.value)}
                    placeholder="10.44.0.229"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Public NAT Port (1–65535)
                  </label>
                  <input
                    type="number"
                    value={revNatPort}
                    onChange={(e) => setRevNatPort(e.target.value)}
                    placeholder="51362"
                    min="1"
                    max="65535"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Incident Timestamp (Local)
                  </label>
                  <input
                    type="datetime-local"
                    value={revTimestamp}
                    onChange={(e) => setRevTimestamp(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Tolerance Window
                  </label>
                  <select
                    value={revTolerance}
                    onChange={(e) => setRevTolerance(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="0">Exact Second Match (0s)</option>
                    <option value="5">&plusmn; 5 Seconds</option>
                    <option value="30">&plusmn; 30 Seconds</option>
                    <option value="60">&plusmn; 1 Minute</option>
                    <option value="300">&plusmn; 5 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={reverseNatQuery.isLoading} className="inline-flex items-center gap-2">
                  {reverseNatQuery.isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>Execute LEA Reverse NAT Trace</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Reverse NAT Results */}
          {activeRevQuery && (
            <Card className="p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>LEA Trace Results for {activeRevQuery.public_ip}:{activeRevQuery.nat_port}</span>
                <Badge
                  label={`${reverseNatQuery.data?.total_matches ?? 0} Matching Incidents`}
                  variant={reverseNatQuery.data?.total_matches ? 'success' : 'default'}
                />
              </h3>

              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Incident Timestamp</Th>
                      <Th>Source (Private)</Th>
                      <Th>Public / Port</Th>
                      <Th>Destination</Th>
                      <Th>Protocol</Th>
                      <Th>Correlated Subscriber</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {reverseNatQuery.data && reverseNatQuery.data.matches.length > 0 ? (
                      reverseNatQuery.data.matches.map((flow) => (
                        <tr
                          key={flow.event_id}
                          onClick={() => setSelectedRecord(flow)}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <Td className="font-mono text-xs">{formatTimestamp(flow.flow_start)}</Td>
                          <Td className="font-mono text-xs font-semibold">{flow.source_ip}:{flow.source_port}</Td>
                          <Td className="font-mono text-xs">{flow.public_ip}:{flow.nat_port}</Td>
                          <Td className="font-mono text-xs">{flow.dest_ip}:{flow.dest_port}</Td>
                          <Td><span className="font-bold text-xs">{flow.protocol_name}</span></Td>
                          <Td className="text-xs">
                            <span className="font-bold">{flow.correlation?.username || flow.subscriber?.username || '—'}</span>
                            <span className="text-gray-500 block text-[11px]">{flow.correlation?.mobile || flow.subscriber?.phone || ''}</span>
                          </Td>
                          <Td>{renderCorrelationStatusBadge(flow.correlation?.status || flow.subscriber?.status)}</Td>
                          <Td className="text-right">
                            <Button size="sm" variant="ghost" className="text-xs" onClick={(e) => { e.stopPropagation(); setSelectedRecord(flow); }}>
                              Inspect
                            </Button>
                          </Td>
                        </tr>
                      ))
                    ) : (
                      <EmptyRow cols={8} message={reverseNatQuery.isLoading ? 'Performing LEA reverse NAT traceback...' : 'No matching NAT record found for specified IP, port, and timestamp'} />
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* EVENT INSPECTOR MODAL                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">NAT Flow Event Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Event Fingerprint */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                  Deterministic Event Fingerprint (SHA-256)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                    {selectedRecord.event_id}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyToClipboard(selectedRecord.event_id)}
                    className="shrink-0 text-xs py-1"
                  >
                    {copiedEventId ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Flow Tuple Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 block">Subscriber Private IP</span>
                  <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                    {selectedRecord.source_ip}:{selectedRecord.source_port}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 block">Public Translated IP</span>
                  <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                    {selectedRecord.public_ip}:{selectedRecord.nat_port}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 block">Destination IP</span>
                  <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                    {selectedRecord.dest_ip}:{selectedRecord.dest_port}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 block">Protocol</span>
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {selectedRecord.protocol_name} ({selectedRecord.protocol})
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 block">Router ID</span>
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    Router #{selectedRecord.vyos_instance}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 block">Data Transferred</span>
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {formatBytes(selectedRecord.bytes_orig + selectedRecord.bytes_reply)}
                  </span>
                </div>
              </div>

              {/* Correlated Identity Card */}
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4" /> Correlated Subscriber Attribution
                  </span>
                  {renderCorrelationStatusBadge(selectedRecord.correlation?.status || selectedRecord.subscriber?.status)}
                </div>

                {selectedRecord.correlation?.user_id || selectedRecord.subscriber?.user_id ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block">Username:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedRecord.correlation?.username || selectedRecord.subscriber?.username}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Mobile Number:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedRecord.correlation?.mobile || selectedRecord.subscriber?.phone || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Customer Account:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {selectedRecord.correlation?.customer_name || selectedRecord.subscriber?.customer_name || 'Individual'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Client Device MAC:</span>
                      <span className="font-mono text-gray-800 dark:text-gray-200">
                        {selectedRecord.correlation?.mac_address || selectedRecord.subscriber?.mac_address || '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 block">Session UUID:</span>
                      <span className="font-mono text-gray-800 dark:text-gray-200 break-all">
                        {selectedRecord.correlation?.session_id || selectedRecord.subscriber?.session_id || '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    No active subscriber session record correlated for this flow timestamp and router instance.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <Button onClick={() => setSelectedRecord(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

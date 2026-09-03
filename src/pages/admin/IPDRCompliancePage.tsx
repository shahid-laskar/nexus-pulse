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
  Briefcase,
  BookmarkPlus,
  FileDown,
  Server,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { ipdrApi } from '@/api/ipdr'
import { nocApi } from '@/api/noc'
import { extractErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { CaseManagementTab } from '@/pages/admin/CaseManagementTab'
import { AttachToCaseModal } from '@/pages/admin/AttachToCaseModal'
import { GenerateReportModal } from '@/pages/admin/GenerateReportModal'
import { ReportJobsDrawer } from '@/pages/admin/ReportJobsDrawer'
import type {
  NATFlowRecord,
  SubscriberIdentityProfile,
  HistoricalSessionRecord,
  CorrelationStatus,
  CaseQueryType,
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
  const [activeTab, setActiveTab] = useState<'cases' | 'subscriber_search' | 'subscriber_trace' | 'reverse_nat'>('subscriber_search')

  // ── Case Attachment & Reproduce State (Task 5.6) ───────────────────────
  const [attachModalState, setAttachModalState] = useState<{
    isOpen: boolean
    queryType: CaseQueryType
    parameters: Record<string, unknown>
    resultCount: number
  }>({
    isOpen: false,
    queryType: 'REVERSE_NAT',
    parameters: {},
    resultCount: 0,
  })

  const handleOpenAttachModal = (
    queryType: CaseQueryType,
    parameters: Record<string, unknown>,
    resultCount: number,
  ) => {
    setAttachModalState({
      isOpen: true,
      queryType,
      parameters,
      resultCount,
    })
  }

  // ── DoT Regulatory Report Generator & Jobs Drawer (Task 5.7) ───────────
  const [reportModalState, setReportModalState] = useState<{
    isOpen: boolean
    queryType: CaseQueryType
    sourceIp?: string
    publicIp?: string
    natPort?: number
    userId?: number
    sessionId?: string
    timeFrom?: string
    timeTo?: string
    timeToleranceSeconds?: number
    vyosInstanceId?: number
  }>({
    isOpen: false,
    queryType: 'SUBSCRIBER_TRACE',
  })

  const [isJobsDrawerOpen, setIsJobsDrawerOpen] = useState(false)

  const handleOpenReportModal = (
    queryType: CaseQueryType,
    params: {
      source_ip?: string
      public_ip?: string
      nat_port?: number
      user_id?: number
      session_id?: string
      time_from?: string
      time_to?: string
      time_tolerance_seconds?: number
      vyos_instance_id?: number
    },
  ) => {
    setReportModalState({
      isOpen: true,
      queryType,
      sourceIp: params.source_ip,
      publicIp: params.public_ip,
      natPort: params.nat_port,
      userId: params.user_id,
      sessionId: params.session_id,
      timeFrom: params.time_from ? new Date(params.time_from).toISOString() : undefined,
      timeTo: params.time_to ? new Date(params.time_to).toISOString() : undefined,
      timeToleranceSeconds: params.time_tolerance_seconds,
      vyosInstanceId: params.vyos_instance_id,
    })
  }

  const handleReproduceQuery = (queryType: CaseQueryType, parameters: Record<string, unknown>) => {
    if (queryType === 'REVERSE_NAT') {
      setActiveTab('reverse_nat')
      if (parameters.public_ip) setRevPublicIp(String(parameters.public_ip))
      if (parameters.nat_port) setRevNatPort(String(parameters.nat_port))
      if (parameters.timestamp) {
        try {
          setRevTimestamp(toDateTimeLocalString(new Date(String(parameters.timestamp))))
        } catch {
          setRevTimestamp(String(parameters.timestamp))
        }
      }
      if (parameters.time_tolerance_seconds !== undefined) {
        setRevTolerance(String(parameters.time_tolerance_seconds))
      }
      toast.success('Loaded LEA Reverse NAT parameters from investigation case')
    } else if (queryType === 'SUBSCRIBER_TRACE') {
      setActiveTab('subscriber_trace')
      if (parameters.source_ip) setSubSourceIp(String(parameters.source_ip))
      if (parameters.time_from) {
        try {
          setSubTimeFrom(toDateTimeLocalString(new Date(String(parameters.time_from))))
        } catch {
          setSubTimeFrom(String(parameters.time_from))
        }
      }
      if (parameters.time_to) {
        try {
          setSubTimeTo(toDateTimeLocalString(new Date(String(parameters.time_to))))
        } catch {
          setSubTimeTo(String(parameters.time_to))
        }
      }
      toast.success('Loaded Subscriber Trace parameters from investigation case')
    } else if (queryType === 'CUSTOMER_SEARCH') {
      setActiveTab('subscriber_search')
      if (parameters.query_term) setSearchQueryText(String(parameters.query_term))
      if (parameters.mode) setSearchField(String(parameters.mode))
      toast.success('Loaded Subscriber Search parameters from investigation case')
    }
  }

  // ── Tab 1: Subscriber Search State ─────────────────────────────────────
  const [searchField, setSearchField] = useState<string>('all')
  const [searchQueryText, setSearchQueryText] = useState<string>('')
  const [searchRouterInstance, setSearchRouterInstance] = useState<number | ''>('')
  const [searchSubPage, setSearchSubPage] = useState(1)
  const [activeSearchFilter, setActiveSearchFilter] = useState<{
    field: string
    query: string
    page: number
    vyos_instance_id?: number
  } | null>(null)

  const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberIdentityProfile | null>(null)
  const [sessionPage, setSessionPage] = useState(1)
  const [selectedSessionForFlows, setSelectedSessionForFlows] = useState<HistoricalSessionRecord | null>(null)
  const [sessionFlowPage, setSessionFlowPage] = useState(1)

  // ── Tab 2: Private IP Trace State ──────────────────────────────────────
  const now = new Date()
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000)

  const [subSourceIp, setSubSourceIp] = useState('')
  const [subRouterInstance, setSubRouterInstance] = useState<number | ''>('')
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
    vyos_instance_id?: number
  } | null>(null)

  // ── Tab 3: Reverse NAT State ───────────────────────────────────────────
  const [revPublicIp, setRevPublicIp] = useState('')
  const [revNatPort, setRevNatPort] = useState('')
  const [revRouterInstance, setRevRouterInstance] = useState<number | ''>('')
  const [revTimestamp, setRevTimestamp] = useState(toDateTimeLocalString(now))
  const [revTolerance, setRevTolerance] = useState('0')
  const [activeRevQuery, setActiveRevQuery] = useState<{
    public_ip: string
    nat_port: number
    timestamp: string
    time_tolerance_seconds: number
    vyos_instance_id?: number
  } | null>(null)

  // ── Modal & Inspector State ───────────────────────────────────────────
  const [selectedRecord, setSelectedRecord] = useState<NATFlowRecord | null>(null)
  const [copiedEventId, setCopiedEventId] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // ── Queries ────────────────────────────────────────────────────────────

  // Fleet Router Instances (for router instance selectors)
  const instancesQuery = useQuery({
    queryKey: ['noc', 'instances-list'],
    queryFn: () => nocApi.listInstances(),
    staleTime: 60_000,
  })
  const routerInstances = instancesQuery.data || []

  // KPI Summary Queries
  const casesSummaryQuery = useQuery({
    queryKey: ['ipdr', 'cases-summary-kpi'],
    queryFn: () => ipdrApi.listCases({ page: 1, page_size: 100 }),
    staleTime: 30_000,
  })
  const totalCasesCount = casesSummaryQuery.data?.total ?? 0
  const activeCasesCount =
    casesSummaryQuery.data?.items.filter(
      (c) => c.status === 'OPEN' || c.status === 'INVESTIGATING',
    ).length ?? 0

  const reportJobsSummaryQuery = useQuery({
    queryKey: ['ipdr', 'report-jobs-kpi'],
    queryFn: () => ipdrApi.listReportJobs(100),
    staleTime: 30_000,
  })
  const totalJobsCount = reportJobsSummaryQuery.data?.total ?? 0
  const completedJobsCount =
    reportJobsSummaryQuery.data?.items.filter((j) => j.status === 'COMPLETED').length ?? 0

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
        vyos_instance_id: activeSearchFilter.vyos_instance_id,
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
        vyos_instance_id: activeSubQuery.vyos_instance_id,
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
        vyos_instance_id: activeRevQuery.vyos_instance_id,
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
      vyos_instance_id: searchRouterInstance ? Number(searchRouterInstance) : undefined,
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
      vyos_instance_id: subRouterInstance ? Number(subRouterInstance) : undefined,
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
      vyos_instance_id: revRouterInstance ? Number(revRouterInstance) : undefined,
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

  const handleExportReverseNatCsv = async () => {
    if (!activeRevQuery) return
    try {
      setIsExporting(true)
      const res = await ipdrApi.exportRegulatoryReport({
        query_type: 'REVERSE_NAT',
        public_ip: activeRevQuery.public_ip,
        nat_port: activeRevQuery.nat_port,
        time_from: activeRevQuery.timestamp,
        time_tolerance_seconds: activeRevQuery.time_tolerance_seconds,
        vyos_instance_id: activeRevQuery.vyos_instance_id,
        format: 'CSV',
      })
      const url = window.URL.createObjectURL(res.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename || `reverse_nat_${activeRevQuery.public_ip.replace(/:/g, '_')}_${activeRevQuery.nat_port}_${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Reverse NAT CSV exported successfully')
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to export Reverse NAT CSV'))
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

  const tabButtons: { id: 'subscriber_search' | 'subscriber_trace' | 'reverse_nat' | 'cases'; label: string; icon: any; count?: number }[] = [
    { id: 'subscriber_search', label: 'Subscriber / Account Search', icon: User, count: subscriberSearchQuery.data?.total },
    { id: 'subscriber_trace', label: 'Subscriber IPDR Trace', icon: Layers, count: subscriberTraceQuery.data?.total },
    { id: 'reverse_nat', label: 'Law Enforcement Reverse NAT Trace (LEA)', icon: ShieldAlert, count: reverseNatQuery.data?.total_matches },
    { id: 'cases', label: 'LEA Investigation Cases', icon: Briefcase, count: totalCasesCount },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="IPDR Regulatory Compliance & LEA Trace"
        subtitle="DoT-compliant subscriber identity correlation, reverse-NAT traceback, and ClickHouse NAT log forensics"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsJobsDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>Report Export Jobs</span>
            {completedJobsCount > 0 && (
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                {completedJobsCount}
              </span>
            )}
          </Button>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {/* ── Top KPI Metrics Strip ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active LEA Cases</p>
                <h4 className="text-2xl font-bold text-amber-600 mt-1">{activeCasesCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{totalCasesCount} total recorded</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">DoT Report Exports</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-1">{completedJobsCount}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{totalJobsCount} jobs on record</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fleet Router Scope</p>
                <h4 className="text-2xl font-bold text-blue-600 mt-1">{routerInstances.length}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">VyOS edge instances</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Server className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Forensics Engine</p>
                <h4 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>ClickHouse</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">SHA-256 sealed logs</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <HardDrive className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ── Pill-Style Navigation Tabs ───────────────────────────────────── */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
          {tabButtons.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-slate-400')} />
                <span>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span
                    className={cn(
                      'ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono',
                      isActive ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-600 font-semibold',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: SUBSCRIBER / ACCOUNT SEARCH                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'subscriber_search' && (
        <div className="space-y-6">
          {/* Search Form Card */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Search className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Subscriber Investigation Search</h3>
                  <p className="text-[11px] text-slate-500">
                    Search by subscriber username, mobile/MSISDN, email, MAC address, session UUID, customer account, or assigned private IP
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-5">
              <form onSubmit={handleSubscriberSearchSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Search Identifier Mode
                    </label>
                    <select
                      value={searchField}
                      onChange={(e) => setSearchField(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500"
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

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Router Scope (Fleet)
                    </label>
                    <select
                      value={searchRouterInstance}
                      onChange={(e) => setSearchRouterInstance(e.target.value ? Number(e.target.value) : '')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">All Fleet Routers</option>
                      {routerInstances.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          Router #{inst.instance_id} ({inst.host || 'VyOS Edge'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Query Term / Identifier
                    </label>
                    <input
                      type="text"
                      value={searchQueryText}
                      onChange={(e) => setSearchQueryText(e.target.value)}
                      placeholder="e.g. 9865321470, rahul, or MAC..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full h-9 text-xs font-semibold gap-2"
                      disabled={subscriberSearchQuery.isLoading}
                    >
                      {subscriberSearchQuery.isLoading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Search className="h-3.5 w-3.5" />
                      )}
                      <span>Find Subscribers</span>
                    </Button>
                  </div>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Search Results List */}
          {activeSearchFilter && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Matching Subscribers ({subscriberSearchQuery.data?.total ?? 0})
                </h3>
                <div className="flex items-center gap-3">
                  {subscriberSearchQuery.isFetching && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Searching captive database...
                    </span>
                  )}
                  {subscriberSearchQuery.data && subscriberSearchQuery.data.items.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleOpenAttachModal(
                          'CUSTOMER_SEARCH',
                          { query_term: searchQueryText, mode: searchField, vyos_instance_id: searchRouterInstance || undefined },
                          subscriberSearchQuery.data?.total ?? 0,
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-xs py-1 px-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5 text-blue-600" />
                      <span>Attach Search to LEA Case</span>
                    </Button>
                  )}
                </div>
              </div>

              {subscriberSearchQuery.data && subscriberSearchQuery.data.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subscriberSearchQuery.data.items.map((sub) => {
                    const isSelected = selectedSubscriber?.user_id === sub.user_id
                    return (
                      <Card
                        key={sub.user_id}
                        className={cn(
                          'p-5 cursor-pointer transition-all duration-150 border-slate-200 shadow-2xs',
                          isSelected
                            ? 'ring-2 ring-blue-500 bg-blue-50/40 border-blue-300'
                            : 'hover:border-slate-300 hover:shadow-xs bg-white'
                        )}
                        onClick={() => handleSelectSubscriber(sub)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-base">
                                {sub.username}
                              </span>
                              <Badge
                                label={sub.active_sessions > 0 ? 'ONLINE' : 'OFFLINE'}
                                variant={sub.active_sessions > 0 ? 'success' : 'default'}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
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

                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 block">Mobile:</span>
                            <span className="font-medium text-slate-800">{sub.phone || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Customer:</span>
                            <span className="font-medium text-slate-800 truncate block">
                              {sub.customer_name || 'Individual'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Total Sessions:</span>
                            <span className="font-semibold text-slate-900">{sub.total_sessions}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Last Seen IP:</span>
                            <span className="font-mono text-slate-800">{sub.last_seen_ip || '—'}</span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                !subscriberSearchQuery.isLoading && (
                  <Card className="p-8 text-center text-slate-500 border-slate-200 shadow-2xs">
                    <User className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="font-medium text-slate-700">No subscribers found matching your query</p>
                    <p className="text-xs text-slate-400 mt-1">Try expanding the query or choosing "All Identifiers"</p>
                  </Card>
                )
              )}
            </div>
          )}

          {/* Selected Subscriber Details & Historical Sessions */}
          {selectedSubscriber && (
            <div className="space-y-6 pt-4 border-t border-slate-200">
              {/* Profile Brief */}
              <Card className="p-6 bg-white border-slate-200 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-200">
                      {selectedSubscriber.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {selectedSubscriber.username}
                        <span className="text-xs font-normal text-slate-500 font-mono">
                          (UID: {selectedSubscriber.user_id})
                        </span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1">
                        <span><strong>Phone:</strong> {selectedSubscriber.phone || '—'}</span>
                        <span><strong>Email:</strong> {selectedSubscriber.email || '—'}</span>
                        <span><strong>Customer:</strong> {selectedSubscriber.customer_name || 'Individual'}</span>
                        <span><strong>Router:</strong> {selectedSubscriber.router_name || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <span className="text-slate-500 block font-semibold uppercase tracking-wider">Total Historical Sessions</span>
                      <span className="font-bold text-slate-900 text-lg">
                        {selectedSubscriber.total_sessions}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sessions Timeline Table */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                      <History className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Historical Sessions &amp; IP Assignments</h4>
                      <p className="text-[11px] text-slate-500">
                        Click "Inspect NAT Events" to query ClickHouse NAT flows during that lease
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
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
                                className={cn('hover:bg-slate-50/70 transition-colors', isDrilled ? 'bg-blue-50/50' : undefined)}
                              >
                                <Td className="font-mono text-xs text-slate-600">{sess.session_id.substring(0, 13)}...</Td>
                                <Td className="font-mono font-semibold text-blue-600">
                                  {sess.ip_address}
                                </Td>
                                <Td className="font-mono text-xs text-slate-600">{sess.mac_address}</Td>
                                <Td className="text-xs text-slate-600">{formatTimestamp(sess.started_at)}</Td>
                                <Td className="text-xs text-slate-600">
                                  {sess.ended_at ? formatTimestamp(sess.ended_at) : formatTimestamp(sess.expires_at)}
                                </Td>
                                <Td className="text-xs text-slate-600">{sess.router_name || `Router #${sess.vyos_instance_id}`}</Td>
                                <Td className="text-xs text-slate-600">
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
                    <div className="flex items-center justify-between p-4 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
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
                </CardBody>
              </Card>

              {/* Drilldown NAT Flow Results Table */}
              {selectedSessionForFlows && (
                <Card className="border-blue-300 shadow-sm bg-white">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 bg-blue-50/40">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <span>NAT Flow Evidence for Session: {selectedSessionForFlows.session_id}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Private IP: <strong className="font-mono text-slate-800">{selectedSessionForFlows.ip_address}</strong> | Time Window: {formatTimestamp(selectedSessionForFlows.started_at)} &rarr; {formatTimestamp(selectedSessionForFlows.ended_at || selectedSessionForFlows.expires_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleOpenReportModal('SESSION_FLOWS', {
                            user_id: selectedSubscriber?.user_id,
                            session_id: selectedSessionForFlows.session_id,
                            source_ip: selectedSessionForFlows.ip_address,
                            time_from: selectedSessionForFlows.started_at,
                            time_to: selectedSessionForFlows.ended_at || selectedSessionForFlows.expires_at,
                          })
                        }
                        className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        <FileDown className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Generate DoT Report</span>
                      </Button>

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
                        className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        <Download className="h-3.5 w-3.5 text-blue-600" />
                        <span>Export CSV</span>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardBody className="p-0">
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
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                              >
                                <Td className="font-mono text-xs text-slate-600">{formatTimestamp(flow.flow_start)}</Td>
                                <Td className="font-mono text-xs font-semibold text-slate-900">
                                  {flow.source_ip}:{flow.source_port}
                                </Td>
                                <Td className="font-mono text-xs text-slate-600">
                                  {flow.public_ip}:{flow.nat_port}
                                </Td>
                                <Td className="font-mono text-xs text-slate-600">
                                  {flow.dest_ip}:{flow.dest_port}
                                </Td>
                                <Td>
                                  <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-700">
                                    {flow.protocol_name}
                                  </span>
                                </Td>
                                <Td className="text-xs text-slate-600">
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
                      <div className="flex items-center justify-between p-4 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
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
                  </CardBody>
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
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Direct Private IP Forensics Trace</h3>
                  <p className="text-[11px] text-slate-500">
                    Query ClickHouse NAT events by private subscriber IP address, edge router scope, and specific temporal window
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-5">
              <form onSubmit={handleSubscriberTraceSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Subscriber Source IP (Private)
                    </label>
                    <input
                      type="text"
                      value={subSourceIp}
                      onChange={(e) => setSubSourceIp(e.target.value)}
                      placeholder="e.g. 10.5.0.5 or 10.99.99.2"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Router Scope (Fleet)
                    </label>
                    <select
                      value={subRouterInstance}
                      onChange={(e) => setSubRouterInstance(e.target.value ? Number(e.target.value) : '')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">All Fleet Routers</option>
                      {routerInstances.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          Router #{inst.instance_id} ({inst.host || 'VyOS Edge'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Time From (Local)
                    </label>
                    <input
                      type="datetime-local"
                      value={subTimeFrom}
                      onChange={(e) => setSubTimeFrom(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Time To (Local)
                    </label>
                    <input
                      type="datetime-local"
                      value={subTimeTo}
                      onChange={(e) => setSubTimeTo(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Time Presets & Submit */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => setPresetRange(1)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                    >
                      1h
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetRange(6)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                    >
                      6h
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetRange(24)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                    >
                      24h
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetRange(168)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                    >
                      7d
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetRange(720)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                    >
                      30d
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={subscriberTraceQuery.isLoading}
                    className="inline-flex items-center gap-2 h-9 text-xs font-semibold"
                  >
                    {subscriberTraceQuery.isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    <span>Query IPDR Records</span>
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Results Table */}
          {activeSubQuery && (
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Flow Records for {activeSubQuery.source_ip}</span>
                    <Badge label={`${subscriberTraceQuery.data?.total ?? 0} Total Events`} variant="info" />
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {subscriberTraceQuery.data && subscriberTraceQuery.data.total > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleOpenReportModal('SUBSCRIBER_TRACE', {
                            source_ip: activeSubQuery.source_ip,
                            time_from: activeSubQuery.time_from,
                            time_to: activeSubQuery.time_to,
                            vyos_instance_id: activeSubQuery.vyos_instance_id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        <FileDown className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Generate DoT Report</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleOpenAttachModal(
                            'SUBSCRIBER_TRACE',
                            {
                              source_ip: activeSubQuery.source_ip,
                              time_from: activeSubQuery.time_from,
                              time_to: activeSubQuery.time_to,
                              vyos_instance_id: activeSubQuery.vyos_instance_id,
                            },
                            subscriberTraceQuery.data?.total ?? 0,
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        <BookmarkPlus className="h-3.5 w-3.5 text-blue-600" />
                        <span>Attach to LEA Case</span>
                      </Button>
                    </>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleExportCsv(activeSubQuery.source_ip, activeSubQuery.time_from, activeSubQuery.time_to)}
                    disabled={isExporting || !subscriberTraceQuery.data?.total}
                    className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-600" />
                    <span>Export Full CSV</span>
                  </Button>
                </div>
              </CardHeader>

              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Flow Start (UTC)</Th>
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
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <Td className="font-mono text-xs text-slate-600">{formatTimestamp(flow.flow_start)}</Td>
                            <Td className="font-mono text-xs font-semibold text-slate-900">{flow.source_ip}:{flow.source_port}</Td>
                            <Td className="font-mono text-xs text-slate-600">{flow.public_ip}:{flow.nat_port}</Td>
                            <Td className="font-mono text-xs text-slate-600">{flow.dest_ip}:{flow.dest_port}</Td>
                            <Td>
                              <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-700">
                                {flow.protocol_name}
                              </span>
                            </Td>
                            <Td className="text-xs text-slate-600">{formatBytes(flow.bytes_orig + flow.bytes_reply)}</Td>
                            <Td className="text-xs font-medium text-slate-800">{flow.correlation?.username || flow.subscriber?.username || '—'}</Td>
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

                {/* Flow Trace Pagination */}
                {subscriberTraceQuery.data && subscriberTraceQuery.data.total_pages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        Page {subPage} of {subscriberTraceQuery.data.total_pages} ({subscriberTraceQuery.data.total.toLocaleString()} total events)
                      </span>
                      <span>•</span>
                      <label className="flex items-center gap-1.5">
                        <span>Show:</span>
                        <select
                          value={subPageSize}
                          onChange={(e) => {
                            const newSize = Number(e.target.value)
                            setSubPageSize(newSize)
                            setSubPage(1)
                            if (activeSubQuery) {
                              setActiveSubQuery({ ...activeSubQuery, page: 1, page_size: newSize })
                            }
                          }}
                          className="border border-slate-300 rounded px-2 py-0.5 text-xs bg-white text-slate-700 shadow-2xs"
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={250}>250</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={subPage <= 1}
                        onClick={() => {
                          const p = Math.max(1, subPage - 1)
                          setSubPage(p)
                          if (activeSubQuery) setActiveSubQuery({ ...activeSubQuery, page: p })
                        }}
                        className="h-8 text-xs"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={subPage >= subscriberTraceQuery.data.total_pages}
                        onClick={() => {
                          const p = subPage + 1
                          setSubPage(p)
                          if (activeSubQuery) setActiveSubQuery({ ...activeSubQuery, page: p })
                        }}
                        className="h-8 text-xs"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: REVERSE NAT TRACE (LEA)                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reverse_nat' && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Law Enforcement Reverse-NAT Traceback</h3>
                  <p className="text-[11px] text-slate-500">
                    Identify the subscriber behind an external post-NAT public IP and public port at an exact incident timestamp
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-5">
              <form onSubmit={handleReverseNatSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Public NAT IP
                    </label>
                    <input
                      type="text"
                      value={revPublicIp}
                      onChange={(e) => setRevPublicIp(e.target.value)}
                      placeholder="e.g. 10.44.0.229"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Public NAT Port (1–65535)
                    </label>
                    <input
                      type="number"
                      value={revNatPort}
                      onChange={(e) => setRevNatPort(e.target.value)}
                      placeholder="e.g. 51362 or 45392"
                      min="1"
                      max="65535"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Router Scope (Fleet)
                    </label>
                    <select
                      value={revRouterInstance}
                      onChange={(e) => setRevRouterInstance(e.target.value ? Number(e.target.value) : '')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">All Fleet Routers</option>
                      {routerInstances.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          Router #{inst.instance_id} ({inst.host || 'VyOS Edge'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Incident Timestamp (Local)
                    </label>
                    <input
                      type="datetime-local"
                      value={revTimestamp}
                      onChange={(e) => setRevTimestamp(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Tolerance Window
                    </label>
                    <select
                      value={revTolerance}
                      onChange={(e) => setRevTolerance(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="0">Exact Second Match (0s)</option>
                      <option value="5">&plusmn; 5 Seconds</option>
                      <option value="30">&plusmn; 30 Seconds</option>
                      <option value="60">&plusmn; 1 Minute</option>
                      <option value="300">&plusmn; 5 Minutes</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={reverseNatQuery.isLoading}
                    className="inline-flex items-center gap-2 h-9 text-xs font-semibold"
                  >
                    {reverseNatQuery.isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    <span>Execute LEA Reverse NAT Trace</span>
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Reverse NAT Results */}
          {activeRevQuery && (
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>LEA Trace Results for {activeRevQuery.public_ip}:{activeRevQuery.nat_port}</span>
                    <Badge
                      label={`${reverseNatQuery.data?.total_matches ?? 0} Matching Incidents`}
                      variant={reverseNatQuery.data?.total_matches ? 'success' : 'default'}
                    />
                  </h3>
                </div>

                {reverseNatQuery.data && reverseNatQuery.data.matches.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleOpenReportModal('REVERSE_NAT', {
                          public_ip: activeRevQuery.public_ip,
                          nat_port: activeRevQuery.nat_port,
                          time_from: activeRevQuery.timestamp,
                          time_tolerance_seconds: activeRevQuery.time_tolerance_seconds,
                          vyos_instance_id: activeRevQuery.vyos_instance_id,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                    >
                      <FileDown className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Generate DoT Report</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleOpenAttachModal(
                          'REVERSE_NAT',
                          {
                            public_ip: activeRevQuery.public_ip,
                            nat_port: activeRevQuery.nat_port,
                            timestamp: activeRevQuery.timestamp,
                            time_tolerance_seconds: activeRevQuery.time_tolerance_seconds,
                            vyos_instance_id: activeRevQuery.vyos_instance_id,
                          },
                          reverseNatQuery.data?.total_matches ?? 0,
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5 text-blue-600" />
                      <span>Attach to LEA Case</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleExportReverseNatCsv}
                      disabled={isExporting}
                      className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-600" />
                      <span>Export CSV</span>
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Incident Timestamp (UTC)</Th>
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
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <Td className="font-mono text-xs text-slate-600">{formatTimestamp(flow.flow_start)}</Td>
                            <Td className="font-mono text-xs font-semibold text-slate-900">{flow.source_ip}:{flow.source_port}</Td>
                            <Td className="font-mono text-xs text-slate-600">{flow.public_ip}:{flow.nat_port}</Td>
                            <Td className="font-mono text-xs text-slate-600">{flow.dest_ip}:{flow.dest_port}</Td>
                            <Td>
                              <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-700">
                                {flow.protocol_name}
                              </span>
                            </Td>
                            <Td className="text-xs">
                              <span className="font-bold text-slate-900">{flow.correlation?.username || flow.subscriber?.username || '—'}</span>
                              <span className="text-slate-500 block text-[11px]">{flow.correlation?.mobile || flow.subscriber?.phone || ''}</span>
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
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: LEA INVESTIGATION CASES                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'cases' && (
        <CaseManagementTab onReproduceQuery={handleReproduceQuery} />
      )}

      {/* ── ATTACH TO CASE MODAL ─────────────────────────────────────────── */}
      <AttachToCaseModal
        isOpen={attachModalState.isOpen}
        onClose={() => setAttachModalState((prev) => ({ ...prev, isOpen: false }))}
        queryType={attachModalState.queryType}
        parameters={attachModalState.parameters}
        resultCount={attachModalState.resultCount}
      />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* EVENT INSPECTOR MODAL                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">NAT Flow Event Forensics Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Event Fingerprint */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Deterministic Event Fingerprint (SHA-256)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-800 break-all">
                    {selectedRecord.event_id}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyToClipboard(selectedRecord.event_id)}
                    className="shrink-0 text-xs py-1 h-7 bg-white border border-slate-200 shadow-2xs"
                  >
                    {copiedEventId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Flow Tuple Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Subscriber Private IP</span>
                  <span className="font-mono font-bold text-sm text-blue-600">
                    {selectedRecord.source_ip}:{selectedRecord.source_port}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Public Translated IP</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {selectedRecord.public_ip}:{selectedRecord.nat_port}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Destination IP</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {selectedRecord.dest_ip}:{selectedRecord.dest_port}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Protocol</span>
                  <span className="font-bold text-sm text-slate-900">
                    {selectedRecord.protocol_name} ({selectedRecord.protocol})
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Router ID</span>
                  <span className="font-bold text-sm text-slate-900">
                    Router #{selectedRecord.vyos_instance}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Data Transferred</span>
                  <span className="font-bold text-sm text-slate-900">
                    {formatBytes(selectedRecord.bytes_orig + selectedRecord.bytes_reply)}
                  </span>
                </div>
              </div>

              {/* Correlated Identity Card */}
              <div className="p-4 bg-blue-50/40 rounded-lg border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-blue-600" /> Correlated Subscriber Attribution
                  </span>
                  {renderCorrelationStatusBadge(selectedRecord.correlation?.status || selectedRecord.subscriber?.status)}
                </div>

                {selectedRecord.correlation?.user_id || selectedRecord.subscriber?.user_id ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Username:</span>
                      <span className="font-bold text-slate-900">
                        {selectedRecord.correlation?.username || selectedRecord.subscriber?.username}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Mobile Number:</span>
                      <span className="font-bold text-slate-900">
                        {selectedRecord.correlation?.mobile || selectedRecord.subscriber?.phone || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Customer Account:</span>
                      <span className="font-medium text-slate-800">
                        {selectedRecord.correlation?.customer_name || selectedRecord.subscriber?.customer_name || 'Individual'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Client Device MAC:</span>
                      <span className="font-mono text-slate-800">
                        {selectedRecord.correlation?.mac_address || selectedRecord.subscriber?.mac_address || '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Session UUID:</span>
                      <span className="font-mono text-slate-800 break-all">
                        {selectedRecord.correlation?.session_id || selectedRecord.subscriber?.session_id || '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No active subscriber session record correlated for this flow timestamp and router instance.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button variant="secondary" onClick={() => setSelectedRecord(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DoT Regulatory Report Generator Modal ─────────────────────────── */}
      <GenerateReportModal
        isOpen={reportModalState.isOpen}
        onClose={() => setReportModalState((prev) => ({ ...prev, isOpen: false }))}
        queryType={reportModalState.queryType}
        sourceIp={reportModalState.sourceIp}
        publicIp={reportModalState.publicIp}
        natPort={reportModalState.natPort}
        userId={reportModalState.userId}
        sessionId={reportModalState.sessionId}
        timeFrom={reportModalState.timeFrom}
        timeTo={reportModalState.timeTo}
        timeToleranceSeconds={reportModalState.timeToleranceSeconds}
        vyosInstanceId={reportModalState.vyosInstanceId}
        onJobCreated={() => setIsJobsDrawerOpen(true)}
      />

      {/* ── Background Report Export Jobs Drawer ──────────────────────────── */}
      <ReportJobsDrawer
        isOpen={isJobsDrawerOpen}
        onClose={() => setIsJobsDrawerOpen(false)}
      />
      </div>
    </div>
  )
}

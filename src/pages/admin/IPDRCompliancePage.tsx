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
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { ipdrApi } from '@/api/ipdr'
import { extractErrorMessage } from '@/lib/axios'
import type { NATFlowRecord } from '@/types'

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

export function IPDRCompliancePage() {
  const [activeTab, setActiveTab] = useState<'subscriber' | 'reverse_nat'>('subscriber')

  // ── Tab 1: Subscriber Form State ─────────────────────────────────────
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

  // ── Tab 2: Reverse NAT Form State ────────────────────────────────────
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

  // ── Modal State ──────────────────────────────────────────────────────
  const [selectedRecord, setSelectedRecord] = useState<NATFlowRecord | null>(null)
  const [copiedEventId, setCopiedEventId] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // ── Subscriber Lookup Query ──────────────────────────────────────────
  const subscriberQuery = useQuery({
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
    enabled: !!activeSubQuery && activeTab === 'subscriber',
  })

  // ── Reverse NAT Query ────────────────────────────────────────────────
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

  // ── Form Submit Handlers ─────────────────────────────────────────────
  const handleSubscriberSearch = (e: React.FormEvent) => {
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

  const handlePageChange = (newPage: number) => {
    if (!activeSubQuery) return
    setSubPage(newPage)
    setActiveSubQuery({
      ...activeSubQuery,
      page: newPage,
    })
  }

  const handleReverseNatSearch = (e: React.FormEvent) => {
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

  const handleExportCsv = async () => {
    if (!activeSubQuery) {
      toast.error('Please run a subscriber search first before exporting')
      return
    }
    try {
      setIsExporting(true)
      const blob = await ipdrApi.downloadCsv({
        source_ip: activeSubQuery.source_ip,
        time_from: new Date(activeSubQuery.time_from).toISOString(),
        time_to: new Date(activeSubQuery.time_to).toISOString(),
        limit: 100000,
      })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ipdr_export_${activeSubQuery.source_ip.replace(/:/g, '_')}_${Date.now()}.csv`
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
    toast.success('Event ID copied to clipboard')
  }

  const setPresetRange = (hours: number) => {
    const end = new Date()
    const start = new Date(Date.now() - hours * 3600 * 1000)
    setSubTimeFrom(toDateTimeLocalString(start))
    setSubTimeTo(toDateTimeLocalString(end))
  }

  const subData = subscriberQuery.data
  const revData = reverseNatQuery.data
  const isSubLoading = subscriberQuery.isFetching
  const isRevLoading = reverseNatQuery.isFetching

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="IPDR Regulatory Compliance & LEA Trace"
        subtitle="Department of Telecom (DoT) & TRAI compliant Internet Protocol Detail Record audit portal"
        actions={
          <Badge
            label="Super Admin Compliance Audit"
            variant="info"
            className="px-3 py-1 font-mono text-xs"
          />
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('subscriber')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'subscriber'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search className="h-4 w-4" />
          Subscriber IPDR Trace
        </button>
        <button
          onClick={() => setActiveTab('reverse_nat')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'reverse_nat'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          Law Enforcement Reverse NAT Trace (LEA)
        </button>
      </div>

      {/* ── TAB 1: SUBSCRIBER TRACE ────────────────────────────────────── */}
      {activeTab === 'subscriber' && (
        <div className="space-y-6">
          <Card className="p-5">
            <form onSubmit={handleSubscriberSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Subscriber Source IP (Private)
                  </label>
                  <input
                    type="text"
                    value={subSourceIp}
                    onChange={(e) => setSubSourceIp(e.target.value)}
                    placeholder="e.g. 10.99.99.2 or 2001:db8::1"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Time From (Local)
                  </label>
                  <input
                    type="datetime-local"
                    value={subTimeFrom}
                    onChange={(e) => setSubTimeFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Time To (Local)
                  </label>
                  <input
                    type="datetime-local"
                    value={subTimeTo}
                    onChange={(e) => setSubTimeTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Page Size
                  </label>
                  <select
                    value={subPageSize}
                    onChange={(e) => setSubPageSize(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value={25}>25 records / page</option>
                    <option value={50}>50 records / page</option>
                    <option value={100}>100 records / page</option>
                    <option value={250}>250 records / page</option>
                  </select>
                </div>
              </div>

              {/* Quick Presets & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setPresetRange(1)}
                    className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600 text-[11px]"
                  >
                    Last 1h
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetRange(24)}
                    className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600 text-[11px]"
                  >
                    Last 24h
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetRange(24 * 7)}
                    className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600 text-[11px]"
                  >
                    Last 7d
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetRange(24 * 30)}
                    className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600 text-[11px]"
                  >
                    Last 30d
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleExportCsv}
                    disabled={!activeSubQuery || isExporting}
                    loading={isExporting}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </Button>

                  <Button type="submit" size="sm" loading={isSubLoading}>
                    <Search className="h-3.5 w-3.5" />
                    Query IPDR Records
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          {/* Overlap Banner */}
          {subData?.has_archive_overlap && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Historical Archive Overlap:</span> The query time range extends beyond the ClickHouse 24-month retention window. Some older records may be stored in long-term cold archives (Parquet/S3).
              </div>
            </div>
          )}

          {/* Results Summary & Table */}
          {activeSubQuery && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    Query Results:
                  </span>
                  <span className="font-mono text-slate-600">
                    {subData?.total ?? 0} flows found
                  </span>
                  {subData?.query_execution_time_ms !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px]">
                      ⚡ {subData.query_execution_time_ms} ms (ClickHouse)
                    </span>
                  )}
                </div>

                {subData && subData.total_pages > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                      Page {subData.page} of {subData.total_pages}
                    </span>
                    <button
                      onClick={() => handlePageChange(subData.page - 1)}
                      disabled={!subData.has_prev || isSubLoading}
                      className="p-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePageChange(subData.page + 1)}
                      disabled={!subData.has_next || isSubLoading}
                      className="p-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <Table>
                <thead>
                  <tr>
                    <Th>Event ID</Th>
                    <Th>Flow Start (UTC)</Th>
                    <Th>Router / Instance</Th>
                    <Th>Source (Private)</Th>
                    <Th>Public (Post-NAT)</Th>
                    <Th>Destination</Th>
                    <Th>Proto</Th>
                    <Th>Volume</Th>
                    <Th>Subscriber Identity</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {isSubLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-xs text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                          Querying ClickHouse columnar store...
                        </div>
                      </td>
                    </tr>
                  ) : !subData?.items || subData.items.length === 0 ? (
                    <EmptyRow cols={10} message="No IPDR records matched the query criteria." />
                  ) : (
                    subData.items.map((row) => (
                      <tr key={row.event_id} className="hover:bg-slate-50 transition-colors">
                        <Td className="font-mono text-[11px] text-slate-500">
                          <span
                            title={row.event_id}
                            className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer hover:bg-slate-200"
                            onClick={() => copyToClipboard(row.event_id)}
                          >
                            {row.event_id.substring(0, 8)}…
                          </span>
                        </Td>
                        <Td className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formatTimestamp(row.flow_start)}
                        </Td>
                        <Td className="font-semibold text-slate-700">
                          VyOS #{row.vyos_instance}
                        </Td>
                        <Td className="font-mono text-xs text-slate-900 font-semibold whitespace-nowrap">
                          {row.source_ip}:{row.source_port}
                        </Td>
                        <Td className="font-mono text-xs text-indigo-700 font-semibold whitespace-nowrap">
                          {row.public_ip}:{row.nat_port}
                        </Td>
                        <Td className="font-mono text-xs text-slate-600 whitespace-nowrap">
                          {row.dest_ip}:{row.dest_port}
                        </Td>
                        <Td>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {row.protocol_name || row.protocol}
                          </span>
                        </Td>
                        <Td className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          ↑{formatBytes(row.bytes_orig)} ↓{formatBytes(row.bytes_reply)}
                        </Td>
                        <Td>
                          {row.subscriber ? (
                            <div className="text-[11px]">
                              <div className="font-bold text-slate-800">
                                {row.subscriber.phone_number || row.subscriber.username}
                              </div>
                              <div className="font-mono text-slate-400 text-[10px]">
                                {row.subscriber.mac_address}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              Uncorrelated
                            </span>
                          )}
                        </Td>
                        <Td className="text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setSelectedRecord(row)}
                          >
                            Details
                          </Button>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: LAW ENFORCEMENT REVERSE NAT TRACE ─────────────────────── */}
      {activeTab === 'reverse_nat' && (
        <div className="space-y-6">
          <Card className="p-5 border-rose-200 bg-rose-50/20">
            <div className="flex items-center gap-2 mb-4 text-rose-700 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              Law Enforcement Agency (LEA) Real-Time Subscriber Identification
            </div>

            <form onSubmit={handleReverseNatSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Public NAT IP
                  </label>
                  <input
                    type="text"
                    value={revPublicIp}
                    onChange={(e) => setRevPublicIp(e.target.value)}
                    placeholder="e.g. 10.44.0.229"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Public NAT Port (1–65535)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={revNatPort}
                    onChange={(e) => setRevNatPort(e.target.value)}
                    placeholder="e.g. 51362"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Incident Timestamp (Local)
                  </label>
                  <input
                    type="datetime-local"
                    value={revTimestamp}
                    onChange={(e) => setRevTimestamp(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Time Window Tolerance
                  </label>
                  <select
                    value={revTolerance}
                    onChange={(e) => setRevTolerance(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="0">Exact Timestamp (0s)</option>
                    <option value="30">±30 Seconds Window</option>
                    <option value="60">±1 Minute Window</option>
                    <option value="300">±5 Minutes Window</option>
                    <option value="900">±15 Minutes Window</option>
                    <option value="3600">±1 Hour Window</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-rose-100">
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  loading={isRevLoading}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Execute LEA Reverse NAT Trace
                </Button>
              </div>
            </form>
          </Card>

          {/* Overlap Banner */}
          {revData?.has_archive_overlap && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Historical Archive Overlap:</span> The incident timestamp falls into cold archive storage.
              </div>
            </div>
          )}

          {/* Results Table */}
          {activeRevQuery && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    LEA Matching Flows:
                  </span>
                  <span className="font-mono text-slate-600">
                    {revData?.total_matches ?? 0} matches identified
                  </span>
                  {revData?.query_execution_time_ms !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px]">
                      ⚡ {revData.query_execution_time_ms} ms (ClickHouse)
                    </span>
                  )}
                </div>
              </div>

              <Table>
                <thead>
                  <tr>
                    <Th>Event ID</Th>
                    <Th>Flow Interval (UTC)</Th>
                    <Th>Router</Th>
                    <Th className="text-rose-700 font-bold">Identified Subscriber IP</Th>
                    <Th>Public (Post-NAT)</Th>
                    <Th>Destination</Th>
                    <Th>Proto</Th>
                    <Th>Volume</Th>
                    <Th>Correlated Identity</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {isRevLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-xs text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-rose-600" />
                          Tracing Netfilter translations across ClickHouse partitions...
                        </div>
                      </td>
                    </tr>
                  ) : !revData?.matches || revData.matches.length === 0 ? (
                    <EmptyRow cols={10} message="No subscriber translation matched the public IP, port, and timestamp." />
                  ) : (
                    revData.matches.map((row) => (
                      <tr key={row.event_id} className="hover:bg-rose-50/40 transition-colors">
                        <Td className="font-mono text-[11px] text-slate-500">
                          <span
                            title={row.event_id}
                            className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer hover:bg-slate-200"
                            onClick={() => copyToClipboard(row.event_id)}
                          >
                            {row.event_id.substring(0, 8)}…
                          </span>
                        </Td>
                        <Td className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formatTimestamp(row.flow_start)}
                        </Td>
                        <Td className="font-semibold text-slate-700">
                          VyOS #{row.vyos_instance}
                        </Td>
                        <Td className="font-mono text-xs text-rose-700 font-bold whitespace-nowrap">
                          {row.source_ip}:{row.source_port}
                        </Td>
                        <Td className="font-mono text-xs text-slate-700 font-semibold whitespace-nowrap">
                          {row.public_ip}:{row.nat_port}
                        </Td>
                        <Td className="font-mono text-xs text-slate-600 whitespace-nowrap">
                          {row.dest_ip}:{row.dest_port}
                        </Td>
                        <Td>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {row.protocol_name || row.protocol}
                          </span>
                        </Td>
                        <Td className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          ↑{formatBytes(row.bytes_orig)} ↓{formatBytes(row.bytes_reply)}
                        </Td>
                        <Td>
                          {row.subscriber ? (
                            <div className="text-[11px]">
                              <div className="font-bold text-slate-800">
                                {row.subscriber.phone_number || row.subscriber.username}
                              </div>
                              <div className="font-mono text-slate-400 text-[10px]">
                                {row.subscriber.mac_address}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              Uncorrelated
                            </span>
                          )}
                        </Td>
                        <Td className="text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setSelectedRecord(row)}
                          >
                            Details
                          </Button>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── RECORD DETAILS MODAL ─────────────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl bg-white shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-slate-900">
                  IPDR NAT Event Specification
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Event ID */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                Deterministic Event ID (SHA-256)
              </div>
              <div className="flex items-center justify-between gap-2 font-mono text-xs text-slate-800 break-all">
                <span>{selectedRecord.event_id}</span>
                <button
                  onClick={() => copyToClipboard(selectedRecord.event_id)}
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 shrink-0"
                  title="Copy Event ID"
                >
                  {copiedEventId ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Translation Tuples */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Pre-NAT Source</div>
                <div className="font-mono text-xs font-bold text-slate-900">
                  {selectedRecord.source_ip}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  Port: {selectedRecord.source_port}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/30 space-y-1">
                <div className="text-[10px] font-bold text-indigo-700 uppercase">Post-NAT (Public)</div>
                <div className="font-mono text-xs font-bold text-indigo-900">
                  {selectedRecord.public_ip}
                </div>
                <div className="font-mono text-[11px] text-indigo-600">
                  Port: {selectedRecord.nat_port}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Destination (Target)</div>
                <div className="font-mono text-xs font-bold text-slate-900">
                  {selectedRecord.dest_ip}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  Port: {selectedRecord.dest_port} ({selectedRecord.protocol_name || selectedRecord.protocol})
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <div className="text-slate-400 text-[10px] uppercase">Flow Start</div>
                <div className="font-mono font-semibold text-slate-700 mt-0.5">
                  {formatTimestamp(selectedRecord.flow_start)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <div className="text-slate-400 text-[10px] uppercase">Flow End</div>
                <div className="font-mono font-semibold text-slate-700 mt-0.5">
                  {formatTimestamp(selectedRecord.flow_end)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <div className="text-slate-400 text-[10px] uppercase">Upload Volume</div>
                <div className="font-mono font-semibold text-slate-700 mt-0.5">
                  {formatBytes(selectedRecord.bytes_orig)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <div className="text-slate-400 text-[10px] uppercase">Download Volume</div>
                <div className="font-mono font-semibold text-slate-700 mt-0.5">
                  {formatBytes(selectedRecord.bytes_reply)}
                </div>
              </div>
            </div>

            {/* Subscriber Info */}
            {selectedRecord.subscriber && (
              <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px] uppercase tracking-wider">
                  <User className="h-3.5 w-3.5 text-blue-700" />
                  Correlated Captive Portal Subscriber
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 font-mono text-[11px]">
                  <div>Phone: <span className="font-bold text-slate-900">{selectedRecord.subscriber.phone_number || '—'}</span></div>
                  <div>Username: <span className="font-bold text-slate-900">{selectedRecord.subscriber.username || '—'}</span></div>
                  <div>MAC: <span className="font-bold text-slate-900">{selectedRecord.subscriber.mac_address || '—'}</span></div>
                  <div>Location: <span className="font-bold text-slate-900">{selectedRecord.subscriber.location || '—'}</span></div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

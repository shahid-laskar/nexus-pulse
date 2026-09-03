import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Briefcase,
  FolderPlus,
  Search,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileText,
  Clock,
  User,
  ExternalLink,
  CheckCircle2,
  Archive,
  RotateCcw,
  AlertCircle,
  Play,
  Filter,
  FileDown,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { ipdrApi } from '@/api/ipdr'
import { extractErrorMessage } from '@/lib/axios'
import { GenerateReportModal } from './GenerateReportModal'
import { ReportJobsDrawer } from './ReportJobsDrawer'
import type {
  CaseFilterParams,
  CasePriority,
  CaseQueryType,
  CaseStatus,
  IPDRCaseCreate,
  IPDRCaseQueryRead,
  IPDRCaseRead,
} from '@/types'

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
    })
  } catch {
    return ts
  }
}

export function renderCaseStatusBadge(status?: CaseStatus | string) {
  switch (status) {
    case 'OPEN':
      return <Badge label="OPEN" variant="info" />
    case 'INVESTIGATING':
      return <Badge label="INVESTIGATING" variant="warning" />
    case 'REPORT_READY':
      return <Badge label="REPORT READY" variant="success" />
    case 'CLOSED':
      return <Badge label="CLOSED" variant="default" />
    case 'ARCHIVED':
      return <Badge label="ARCHIVED" variant="danger" />
    default:
      return <Badge label={status || 'UNKNOWN'} variant="default" />
  }
}

export function renderPriorityBadge(priority?: CasePriority | string) {
  switch (priority) {
    case 'URGENT':
      return <Badge label="URGENT" variant="danger" />
    case 'HIGH':
      return <Badge label="HIGH" variant="warning" />
    case 'MEDIUM':
      return <Badge label="MEDIUM" variant="info" />
    case 'LOW':
      return <Badge label="LOW" variant="default" />
    default:
      return <Badge label={priority || 'NORMAL'} variant="default" />
  }
}

interface CaseManagementTabProps {
  onReproduceQuery: (queryType: CaseQueryType, parameters: Record<string, unknown>) => void
}

export function CaseManagementTab({ onReproduceQuery }: CaseManagementTabProps) {
  const queryClient = useQueryClient()

  // Filter and Pagination State
  const [filterStatus, setFilterStatus] = useState<CaseStatus | ''>('')
  const [filterPriority, setFilterPriority] = useState<CasePriority | ''>('')
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)

  // Selected Case Detail
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null)

  // Modals State
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false)
  const [newCaseForm, setNewCaseForm] = useState<IPDRCaseCreate>({
    title: '',
    description: '',
    requesting_agency: '',
    requester_name: '',
    requester_contact: '',
    legal_reference: '',
    external_reference: '',
    priority: 'MEDIUM',
    case_number: '',
  })

  // Status Change Dialog State
  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean
    targetStatus: CaseStatus | null
    closureNotes: string
  }>({
    isOpen: false,
    targetStatus: null,
    closureNotes: '',
  })

  // DoT Report Generator & Jobs Drawer State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isJobsDrawerOpen, setIsJobsDrawerOpen] = useState(false)

  // Fingerprint copy state
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
    toast.success('Deterministic fingerprint copied')
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const casesListQuery = useQuery({
    queryKey: ['ipdr', 'cases', { status: filterStatus, priority: filterPriority, search: searchText, page }],
    queryFn: () =>
      ipdrApi.listCases({
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        search: searchText.trim() || undefined,
        page,
        page_size: 15,
      }),
    refetchOnWindowFocus: false,
  })

  const caseDetailQuery = useQuery({
    queryKey: ['ipdr', 'case', selectedCaseId],
    queryFn: () => (selectedCaseId ? ipdrApi.getCase(selectedCaseId) : null),
    enabled: selectedCaseId !== null,
    refetchOnWindowFocus: false,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createCaseMutation = useMutation({
    mutationFn: (payload: IPDRCaseCreate) => ipdrApi.createCase(payload),
    onSuccess: (newCase) => {
      toast.success(`Created investigation case ${newCase.case_number}`)
      setIsNewCaseModalOpen(false)
      setNewCaseForm({
        title: '',
        description: '',
        requesting_agency: '',
        requester_name: '',
        requester_contact: '',
        legal_reference: '',
        external_reference: '',
        priority: 'MEDIUM',
        case_number: '',
      })
      queryClient.invalidateQueries({ queryKey: ['ipdr', 'cases'] })
      setSelectedCaseId(newCase.id)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to create case'))
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ caseId, status, notes }: { caseId: number; status: CaseStatus; notes?: string }) =>
      ipdrApi.updateCaseStatus(caseId, { status, closure_notes: notes }),
    onSuccess: (updatedCase) => {
      toast.success(`Case status updated to ${updatedCase.status}`)
      setStatusDialog({ isOpen: false, targetStatus: null, closureNotes: '' })
      queryClient.invalidateQueries({ queryKey: ['ipdr', 'cases'] })
      queryClient.invalidateQueries({ queryKey: ['ipdr', 'case', updatedCase.id] })
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to update case status'))
    },
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCaseForm.title.trim()) {
      toast.error('Please enter a case title')
      return
    }
    if (!newCaseForm.requesting_agency.trim()) {
      toast.error('Please enter the requesting agency name')
      return
    }
    if (!newCaseForm.requester_name.trim()) {
      toast.error('Please enter the requester officer name')
      return
    }
    if (!newCaseForm.legal_reference.trim()) {
      toast.error('Please specify the legal reference (e.g. 91 CrPC notice)')
      return
    }

    createCaseMutation.mutate({
      ...newCaseForm,
      case_number: newCaseForm.case_number?.trim() || undefined,
      external_reference: newCaseForm.external_reference?.trim() || undefined,
      description: newCaseForm.description?.trim() || undefined,
    })
  }

  const promptStatusChange = (targetStatus: CaseStatus) => {
    setStatusDialog({
      isOpen: true,
      targetStatus,
      closureNotes: '',
    })
  }

  const confirmStatusChange = () => {
    if (!selectedCaseId || !statusDialog.targetStatus) return
    updateStatusMutation.mutate({
      caseId: selectedCaseId,
      status: statusDialog.targetStatus,
      notes: statusDialog.closureNotes.trim() || undefined,
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── CASE LIST VIEW (When no case is selected) ────────────────────── */}
      {selectedCaseId === null ? (
        <div className="space-y-6">
          {/* Header & New Case Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span>Law Enforcement & Regulatory Investigation Cases</span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Controlled, auditable case management file tracking all reverse NAT and subscriber identity queries.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="secondary"
                onClick={() => setIsJobsDrawerOpen(true)}
                className="inline-flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                <span>Export Jobs</span>
              </Button>

              <Button
                onClick={() => setIsNewCaseModalOpen(true)}
                className="inline-flex items-center gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                <span>New Investigation Case</span>
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search by case #, title, FIR / external ref, agency, or officer..."
                    className="w-full pl-9 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as CaseStatus | '')
                    setPage(1)
                  }}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="REPORT_READY">REPORT READY</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div>
                <select
                  value={filterPriority}
                  onChange={(e) => {
                    setFilterPriority(e.target.value as CasePriority | '')
                    setPage(1)
                  }}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Priorities</option>
                  <option value="URGENT">URGENT</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Cases Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>Active & Historic Investigation Files</span>
                <Badge label={`${casesListQuery.data?.total ?? 0} Total Cases`} variant="default" />
              </h3>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => casesListQuery.refetch()}
                disabled={casesListQuery.isFetching}
                className="text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${casesListQuery.isFetching ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Case Reference</Th>
                    <Th>Title / Legal Subject</Th>
                    <Th>Requesting Agency & Officer</Th>
                    <Th>Priority</Th>
                    <Th>Status</Th>
                    <Th>Queries Attached</Th>
                    <Th>Created Date</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {casesListQuery.data && casesListQuery.data.items.length > 0 ? (
                    casesListQuery.data.items.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCaseId(c.id)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <Td className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {c.case_number}
                        </Td>
                        <Td className="text-xs">
                          <span className="font-semibold block text-gray-900 dark:text-white">{c.title}</span>
                          <span className="text-gray-500 block text-[11px]">
                            {c.legal_reference} {c.external_reference ? `| ${c.external_reference}` : ''}
                          </span>
                        </Td>
                        <Td className="text-xs">
                          <span className="font-medium text-gray-800 dark:text-gray-200 block">{c.requesting_agency}</span>
                          <span className="text-gray-500 block text-[11px]">{c.requester_name}</span>
                        </Td>
                        <Td>{renderPriorityBadge(c.priority)}</Td>
                        <Td>{renderCaseStatusBadge(c.status)}</Td>
                        <Td className="text-xs font-mono font-semibold">
                          <span className="inline-flex items-center gap-1">
                            <Search className="h-3.5 w-3.5 text-gray-400" />
                            {c.query_count}
                          </span>
                        </Td>
                        <Td className="text-xs font-mono text-gray-500">{formatTimestamp(c.created_at)}</Td>
                        <Td className="text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs py-1 px-2.5 inline-flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCaseId(c.id)
                            }}
                          >
                            <span>Open File</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Td>
                      </tr>
                    ))
                  ) : (
                    <EmptyRow
                      cols={8}
                      message={casesListQuery.isLoading ? 'Loading investigation cases...' : 'No investigation cases found'}
                    />
                  )}
                </tbody>
              </Table>
            </div>

            {/* Pagination */}
            {casesListQuery.data && casesListQuery.data.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500">
                  Page {page} of {casesListQuery.data.total_pages} ({casesListQuery.data.total} total cases)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= casesListQuery.data.total_pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* ── CASE DETAIL VIEW (When a case is selected) ───────────────────── */
        <div className="space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedCaseId(null)}
              className="inline-flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Cases List</span>
            </Button>

            <div className="flex items-center gap-2">
              {caseDetailQuery.data && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsReportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 border-teal-500/50 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/40"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Generate DoT Report</span>
                  </Button>

                  {caseDetailQuery.data.status === 'OPEN' && (
                    <Button
                      size="sm"
                      onClick={() => promptStatusChange('INVESTIGATING')}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Start Investigation</span>
                    </Button>
                  )}

                  {caseDetailQuery.data.status === 'INVESTIGATING' && (
                    <Button
                      size="sm"
                      onClick={() => promptStatusChange('REPORT_READY')}
                      className="inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Report Ready</span>
                    </Button>
                  )}

                  {(caseDetailQuery.data.status === 'OPEN' ||
                    caseDetailQuery.data.status === 'INVESTIGATING' ||
                    caseDetailQuery.data.status === 'REPORT_READY') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => promptStatusChange('CLOSED')}
                      className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700"
                    >
                      <span>Close Case File</span>
                    </Button>
                  )}

                  {caseDetailQuery.data.status === 'CLOSED' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => promptStatusChange('OPEN')}
                        className="inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reopen Case</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => promptStatusChange('ARCHIVED')}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>Archive Case File</span>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {caseDetailQuery.data ? (
            <>
              {/* Case Overview Card */}
              <Card className="p-6 border-l-4 border-l-indigo-600 dark:border-l-indigo-400">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                        {caseDetailQuery.data.case_number}
                      </h3>
                      {renderCaseStatusBadge(caseDetailQuery.data.status)}
                      {renderPriorityBadge(caseDetailQuery.data.priority)}
                    </div>
                    <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-1">
                      {caseDetailQuery.data.title}
                    </h4>
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    <div>Opened: {formatTimestamp(caseDetailQuery.data.created_at)}</div>
                    <div>By: {caseDetailQuery.data.created_by_username || 'System Administrator'}</div>
                    {caseDetailQuery.data.closed_at && (
                      <div className="text-rose-600 dark:text-rose-400 font-medium">
                        Closed: {formatTimestamp(caseDetailQuery.data.closed_at)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-gray-500 block uppercase font-semibold">Requesting Agency:</span>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {caseDetailQuery.data.requesting_agency}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase font-semibold">Investigator Officer:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                      {caseDetailQuery.data.requester_name}
                    </span>
                    <span className="text-gray-500 block">{caseDetailQuery.data.requester_contact}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase font-semibold">Legal Authorization:</span>
                    <span className="font-medium text-indigo-700 dark:text-indigo-300">
                      {caseDetailQuery.data.legal_reference}
                    </span>
                    {caseDetailQuery.data.external_reference && (
                      <span className="text-gray-500 block">
                        External Ref: {caseDetailQuery.data.external_reference}
                      </span>
                    )}
                  </div>
                </div>

                {caseDetailQuery.data.description && (
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <span className="text-gray-500 block uppercase font-semibold mb-1">Case Brief / Context:</span>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/60 p-3 rounded-md">
                      {caseDetailQuery.data.description}
                    </p>
                  </div>
                )}

                {caseDetailQuery.data.closure_notes && (
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <span className="text-rose-600 dark:text-rose-400 block uppercase font-semibold mb-1">
                      Closure Notes & Findings:
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 italic bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-md border border-rose-200 dark:border-rose-900">
                      {caseDetailQuery.data.closure_notes}
                    </p>
                  </div>
                )}
              </Card>

              {/* Attached Queries & Evidence Trail */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <span>Executed Query Evidence & Audit Trail</span>
                      <Badge label={`${caseDetailQuery.data.queries.length} Queries`} variant="default" />
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Append-only record of all searches executed under this investigation with reproducible deterministic fingerprints.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {caseDetailQuery.data.queries.length > 0 ? (
                    caseDetailQuery.data.queries.map((q: IPDRCaseQueryRead) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200">
                              {q.query_type}
                            </span>
                            <span className="text-xs text-gray-500">
                              Executed by <strong>{q.requested_by_username || 'Admin'}</strong> on{' '}
                              {formatTimestamp(q.requested_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                              Matches Found: <strong className="text-indigo-600">{q.result_count}</strong>
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs py-1 px-2.5 inline-flex items-center gap-1"
                              onClick={() => onReproduceQuery(q.query_type, q.query_parameters_redacted)}
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Rerun / Reproduce Trace</span>
                            </Button>
                          </div>
                        </div>

                        {/* Fingerprint Bar */}
                        <div className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-900/60 rounded font-mono text-[11px] text-gray-600 dark:text-gray-300">
                          <div className="truncate">
                            <span className="text-gray-400 mr-2">SHA-256:</span>
                            <span>{q.query_parameters_hash}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(q.query_parameters_hash)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 ml-2"
                            title="Copy Hash"
                          >
                            {copiedHash === q.query_parameters_hash ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Parameter Summary */}
                        <div className="p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded text-xs space-y-1">
                          <span className="text-gray-500 block uppercase font-semibold text-[10px]">
                            Recorded Query Parameters:
                          </span>
                          <div className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                            {JSON.stringify(q.query_parameters_redacted)}
                          </div>
                          {q.notes && (
                            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
                              <span className="font-semibold text-gray-700 dark:text-gray-200">Investigator Notes:</span>{' '}
                              {q.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="font-medium">No queries attached to this investigation case yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Execute a trace in Subscriber Search, IPDR Trace, or Reverse NAT and click "Attach to LEA Case".
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-sm text-gray-500">Loading case file details...</p>
            </Card>
          )}
        </div>
      )}

      {/* ── CREATE CASE MODAL ────────────────────────────────────────────── */}
      {isNewCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create New Investigation Case</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCaseModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Case Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCaseForm.title}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, title: e.target.value })}
                    placeholder="e.g. Cyber Fraud Investigation - Suspected Mule IP"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Requesting Agency *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCaseForm.requesting_agency}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, requesting_agency: e.target.value })}
                    placeholder="e.g. Delhi Police Cyber Cell / CBI"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Investigating Officer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCaseForm.requester_name}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, requester_name: e.target.value })}
                    placeholder="e.g. Inspector R. Sharma"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Requester Contact Details *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCaseForm.requester_contact}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, requester_contact: e.target.value })}
                    placeholder="e.g. +91-9876543210 / officer@police.gov.in"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Legal Reference / Section *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCaseForm.legal_reference}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, legal_reference: e.target.value })}
                    placeholder="e.g. Notice u/s 91 CrPC / Section 69 IT Act"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    External FIR / Case Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCaseForm.external_reference || ''}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, external_reference: e.target.value })}
                    placeholder="e.g. FIR-102/2026 / Warrant-55"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Priority Severity
                  </label>
                  <select
                    value={newCaseForm.priority}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, priority: e.target.value as CasePriority })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Custom Case Number (Optional — Auto-generated if blank)
                  </label>
                  <input
                    type="text"
                    value={newCaseForm.case_number || ''}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, case_number: e.target.value })}
                    placeholder="e.g. LEA-20260903-XXXX"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Investigation Brief / Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={newCaseForm.description || ''}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, description: e.target.value })}
                    placeholder="Enter context, incident timeline, or specific target IPs..."
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsNewCaseModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCaseMutation.isPending}
                  className="inline-flex items-center gap-2"
                >
                  {createCaseMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                  <span>Create Case File</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STATUS CHANGE / CLOSURE MODAL ─────────────────────────────────── */}
      {statusDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
              <AlertCircle className="h-5 w-5" />
              <span>Update Case Status to {statusDialog.targetStatus}</span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {statusDialog.targetStatus === 'CLOSED'
                ? 'Please provide closure notes summarizing the findings or court submission status.'
                : statusDialog.targetStatus === 'ARCHIVED'
                ? 'Archiving a case makes it immutable and locks all queries from further modification.'
                : `Transition this investigation case to status: ${statusDialog.targetStatus}.`}
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Investigation / Closure Notes
              </label>
              <textarea
                rows={3}
                value={statusDialog.closureNotes}
                onChange={(e) => setStatusDialog({ ...statusDialog, closureNotes: e.target.value })}
                placeholder="Enter justification or conclusion remarks..."
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStatusDialog({ isOpen: false, targetStatus: null, closureNotes: '' })}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmStatusChange}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? 'Updating...' : 'Confirm Status Update'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DoT Regulatory Report Generator Modal */}
      <GenerateReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        currentCase={caseDetailQuery.data}
        onJobCreated={() => setIsJobsDrawerOpen(true)}
      />

      {/* Background Report Export Jobs Drawer */}
      <ReportJobsDrawer
        isOpen={isJobsDrawerOpen}
        onClose={() => setIsJobsDrawerOpen(false)}
      />
    </div>
  )
}

import React, { useState } from 'react'
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Archive,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  X,
} from 'lucide-react'
import { ipdrApi } from '@/api/ipdr'
import { extractErrorMessage } from '@/lib/axios'
import type {
  CaseQueryType,
  IPDRCaseRead,
  IPDRReportExportParams,
  IPDRReportJobCreate,
  ReportFormat,
} from '@/types'
import toast from 'react-hot-toast'

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  currentCase?: IPDRCaseRead | null
  queryType?: CaseQueryType
  sourceIp?: string
  publicIp?: string
  natPort?: number
  userId?: number
  sessionId?: string
  timeFrom?: string
  timeTo?: string
  timeToleranceSeconds?: number
  vyosInstanceId?: number
  onJobCreated?: () => void
}

const FORMAT_OPTIONS: Array<{
  format: ReportFormat
  label: string
  description: string
  icon: React.ElementType
  color: string
}> = [
  {
    format: 'CSV',
    label: 'DoT Canonical CSV',
    description: 'Universal streaming bulk-data export with DoT header comments and standard columns',
    icon: FileText,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    format: 'XLSX',
    label: 'Formatted Excel (XLSX)',
    description: 'Multi-sheet workbook with styled event records and investigation provenance manifest',
    icon: FileSpreadsheet,
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  },
  {
    format: 'PDF',
    label: 'Official LEA Dossier (PDF)',
    description: 'Court-ready formal investigation dossier with subscriber attribution and tamper seal',
    icon: FileText,
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    format: 'JSON',
    label: 'Structured Audit JSON',
    description: 'Deterministic machine-readable JSON array with comprehensive audit metadata',
    icon: FileCode,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    format: 'ZIP',
    label: 'Evidence Package (ZIP)',
    description: 'Chain of custody bundle: CSV + JSON + Manifest + Query + Hashes.txt checksums',
    icon: Archive,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  },
]

export const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  currentCase,
  queryType = 'SUBSCRIBER_TRACE',
  sourceIp,
  publicIp,
  natPort,
  userId,
  sessionId,
  timeFrom,
  timeTo,
  timeToleranceSeconds,
  vyosInstanceId,
  onJobCreated,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('CSV')
  const [exportMode, setExportMode] = useState<'SYNC' | 'ASYNC'>('SYNC')
  const [isExporting, setIsExporting] = useState(false)
  const [copiedHash, setCopiedHash] = useState(false)
  const [completedResult, setCompletedResult] = useState<{
    filename: string
    sha256: string
    reportId: string
  } | null>(null)

  if (!isOpen) return null

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(true)
    toast.success('SHA-256 hash copied to clipboard')
    setTimeout(() => setCopiedHash(false), 2000)
  }

  const handleGenerate = async () => {
    setIsExporting(true)
    setCompletedResult(null)

    try {
      if (exportMode === 'SYNC') {
        const exportParams: IPDRReportExportParams = {
          case_id: currentCase?.id,
          query_type: queryType,
          source_ip: sourceIp,
          public_ip: publicIp,
          nat_port: natPort,
          user_id: userId,
          session_id: sessionId,
          time_from: timeFrom,
          time_to: timeTo,
          time_tolerance_seconds: timeToleranceSeconds,
          format: selectedFormat,
        }

        const res = await ipdrApi.exportRegulatoryReport(exportParams)

        // Trigger browser download
        const url = window.URL.createObjectURL(res.blob)
        const link = document.createElement('a')
        link.href = url
        link.download = res.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        setCompletedResult({
          filename: res.filename,
          sha256: res.sha256,
          reportId: res.reportId,
        })
        toast.success(`Exported ${selectedFormat} report successfully!`)
      } else {
        // Enqueue background job
        const jobPayload: IPDRReportJobCreate = {
          case_id: currentCase?.id,
          query_type: queryType,
          format: selectedFormat,
          query_parameters: {
            source_ip: sourceIp,
            public_ip: publicIp,
            nat_port: natPort,
            user_id: userId,
            session_id: sessionId,
            time_from: timeFrom,
            time_to: timeTo,
            time_tolerance_seconds: timeToleranceSeconds,
            vyos_instance_id: vyosInstanceId,
          },
        }

        const job = await ipdrApi.createReportJob(jobPayload)
        toast.success(`Enqueued background export job ${job.id}`)
        if (onJobCreated) {
          onJobCreated()
        }
        onClose()
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to generate compliance report'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
            <div>
              <h3 className="text-base font-semibold text-white">DoT Regulatory IPDR Report Generator</h3>
              <p className="text-xs text-slate-400">
                Generate tamper-evident, SHA-256 authenticated compliance deliverables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Target Metadata Banner */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Target Investigation:</span>
              <span className="font-medium text-white">
                {currentCase ? `${currentCase.case_number} — ${currentCase.title}` : 'Standalone Regulatory Search'}
              </span>
            </div>
            {currentCase?.requesting_agency && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Requesting Agency:</span>
                <span className="text-slate-300">
                  {currentCase.requesting_agency} ({currentCase.requester_name})
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Query Classification:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-teal-400">
                {queryType}
              </span>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Output Format
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = selectedFormat === opt.format
                return (
                  <button
                    key={opt.format}
                    type="button"
                    onClick={() => setSelectedFormat(opt.format)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? `${opt.color} ring-1 ring-teal-500/50`
                        : 'border-slate-800 bg-slate-800/30 text-slate-400 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white">{opt.label}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Execution Mode */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Execution Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportMode('SYNC')}
                className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all ${
                  exportMode === 'SYNC'
                    ? 'border-teal-500 bg-teal-500/10 text-white'
                    : 'border-slate-800 bg-slate-800/30 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <Download className="h-4 w-4 text-teal-400 shrink-0" />
                <div>
                  <div className="text-xs font-medium">Immediate Download</div>
                  <div className="text-[10px] text-slate-400">Stream file directly to browser</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportMode('ASYNC')}
                className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all ${
                  exportMode === 'ASYNC'
                    ? 'border-teal-500 bg-teal-500/10 text-white'
                    : 'border-slate-800 bg-slate-800/30 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-medium">Asynchronous Export Job</div>
                  <div className="text-[10px] text-slate-400">Recommended for &gt; 5k events</div>
                </div>
              </button>
            </div>
          </div>

          {/* Completed Result Card */}
          {completedResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle className="h-4 w-4" />
                <span>Report Generated & Cryptographically Sealed</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Report ID:</span>
                  <span className="font-mono text-white">{completedResult.reportId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">File Name:</span>
                  <span className="font-mono text-white">{completedResult.filename}</span>
                </div>
                <div className="pt-1.5 border-t border-emerald-500/20">
                  <div className="text-slate-400 mb-1 flex items-center justify-between">
                    <span>SHA-256 Digest:</span>
                    <button
                      onClick={() => handleCopyHash(completedResult.sha256)}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                    >
                      {copiedHash ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedHash ? 'Copied' : 'Copy Hash'}
                    </button>
                  </div>
                  <div className="break-all rounded bg-slate-950/80 p-2 font-mono text-[11px] text-emerald-300 select-all border border-emerald-500/20">
                    {completedResult.sha256}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-800/40 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            {completedResult ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50 transition-colors"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>{exportMode === 'SYNC' ? 'Generating Report...' : 'Enqueueing Job...'}</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>{exportMode === 'SYNC' ? 'Generate & Download' : 'Start Background Job'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

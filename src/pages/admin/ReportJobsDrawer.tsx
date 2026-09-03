import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  Archive,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react'
import { ipdrApi } from '@/api/ipdr'
import { extractErrorMessage } from '@/lib/axios'
import type { IPDRReportJobRead, ReportFormat } from '@/types'
import toast from 'react-hot-toast'

interface ReportJobsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const formatIcons: Record<ReportFormat, React.ElementType> = {
  CSV: FileText,
  XLSX: FileSpreadsheet,
  PDF: FileText,
  JSON: FileCode,
  ZIP: Archive,
}

export const ReportJobsDrawer: React.FC<ReportJobsDrawerProps> = ({ isOpen, onClose }) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null)

  const {
    data: jobsData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['ipdr', 'report-jobs'],
    queryFn: () => ipdrApi.listReportJobs(50),
    enabled: isOpen,
    refetchInterval: (query) => {
      // Auto-poll every 3s if any job is still pending or processing
      const hasActive = query.state.data?.items.some(
        (j) => j.status === 'PENDING' || j.status === 'PROCESSING',
      )
      return hasActive ? 3000 : false
    },
  })

  if (!isOpen) return null

  const handleDownload = async (job: IPDRReportJobRead) => {
    setDownloadingId(job.id)
    try {
      const res = await ipdrApi.downloadReportJobArtifact(job.id)
      const url = window.URL.createObjectURL(res.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = res.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success(`Downloaded ${res.filename}`)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to download report artifact'))
    } finally {
      setDownloadingId(null)
    }
  }

  const handleCopyHash = (jobId: string, hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHashId(jobId)
    toast.success('SHA-256 hash copied to clipboard')
    setTimeout(() => setCopiedHashId(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        )
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-teal-400 border border-teal-500/30 animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Processing
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/30">
            <Clock className="h-3 w-3" />
            Queued
          </span>
        )
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400 border border-rose-500/30">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-teal-400" />
            <div>
              <h3 className="text-base font-semibold text-white">DoT Report Export Jobs</h3>
              <p className="text-xs text-slate-400">
                Audit history of asynchronous regulatory report extraction jobs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-teal-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin text-teal-400 mb-3" />
              <p className="text-xs">Loading export jobs history...</p>
            </div>
          ) : !jobsData?.items.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Clock className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-300">No export jobs recorded yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Asynchronous regulatory export jobs will appear here with real-time status and SHA-256 seals.
              </p>
            </div>
          ) : (
            jobsData.items.map((job) => {
              const Icon = formatIcons[job.report_format] || FileText
              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 transition-colors hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-teal-400 shrink-0 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-white">{job.id}</span>
                          {getStatusBadge(job.status)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Format: <span className="font-medium text-slate-300">{job.report_format}</span> • Query:{' '}
                          <span className="font-medium text-slate-300">{job.query_type}</span>
                          {job.case_number && (
                            <>
                              {' '}• Case:{' '}
                              <span className="font-medium text-teal-400">{job.case_number}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Running Jobs */}
                  {job.status === 'PROCESSING' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Extracting events...</span>
                        <span>{job.progress_pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-teal-500 transition-all duration-300"
                          style={{ width: `${job.progress_pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Failure message */}
                  {job.status === 'FAILED' && job.error_message && (
                    <div className="rounded border border-rose-500/20 bg-rose-500/10 p-2 text-[11px] text-rose-300">
                      Error: {job.error_message}
                    </div>
                  )}

                  {/* Metadata and SHA-256 for Completed Jobs */}
                  {job.status === 'COMPLETED' && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Records: <strong className="text-white">{job.total_records}</strong></span>
                        <span>Size: <strong className="text-white">{(job.file_size_bytes / 1024).toFixed(1)} KB</strong></span>
                        <span>By: <strong className="text-white">{job.requested_by_username || 'Operator'}</strong></span>
                      </div>

                      {job.sha256_checksum && (
                        <div className="rounded bg-slate-900/90 p-2 border border-slate-800">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <span className="flex items-center gap-1 text-emerald-400">
                              <ShieldCheck className="h-3 w-3" />
                              SHA-256 Digest
                            </span>
                            <button
                              onClick={() => handleCopyHash(job.id, job.sha256_checksum!)}
                              className="text-slate-400 hover:text-white"
                            >
                              {copiedHashId === job.id ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <div className="font-mono text-[10px] text-slate-300 break-all select-all">
                            {job.sha256_checksum}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleDownload(job)}
                          disabled={downloadingId === job.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50 transition-colors"
                        >
                          {downloadingId === job.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          <span>Download Artifact</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

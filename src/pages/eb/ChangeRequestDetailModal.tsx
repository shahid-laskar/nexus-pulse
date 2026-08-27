import { X, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { ChangeRequestStatusBadge, ChangeRequestTypeBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { ChangeRequest } from '@/types'

interface ChangeRequestDetailModalProps {
  request: ChangeRequest | null
  isOpen: boolean
  onClose: () => void
  onResubmit?: (request: ChangeRequest) => void
}

export function ChangeRequestDetailModal({
  request,
  isOpen,
  onClose,
  onResubmit,
}: ChangeRequestDetailModalProps) {
  if (!isOpen || !request) return null

  const formattedRequestedAt = request.requested_at
    ? new Date(request.requested_at).toLocaleString()
    : '—'
  const formattedReviewedAt = request.reviewed_at
    ? new Date(request.reviewed_at).toLocaleString()
    : '—'
  const formattedAppliedAt = request.applied_at
    ? new Date(request.applied_at).toLocaleString()
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Change Request #{request.id}</h2>
              <ChangeRequestTypeBadge type={request.request_type} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Customer ID: {request.customer_id} • Submitted: {formattedRequestedAt}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status & Lifecycle Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Current Status
              </span>
              <ChangeRequestStatusBadge status={request.status} />
            </div>

            <div className="text-xs text-slate-600 space-y-0.5 text-right">
              {request.reviewed_at && (
                <p>
                  <span className="font-semibold">Reviewed:</span> {formattedReviewedAt}
                </p>
              )}
              {request.applied_at && (
                <p className="text-emerald-700 font-medium">
                  <span className="font-semibold">Applied:</span> {formattedAppliedAt}
                </p>
              )}
            </div>
          </div>

          {/* EB Notes */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">
              Requester Rationale (EB Admin)
            </span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap">
              {request.eb_notes || <span className="text-slate-400 italic">No notes provided</span>}
            </div>
          </div>

          {/* NOC Notes */}
          {request.noc_notes && (
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-purple-800 block mb-1">
                NOC Review Notes & Feedback
              </span>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-sm text-purple-900 whitespace-pre-wrap">
                {request.noc_notes}
              </div>
            </div>
          )}

          {/* Proposed Payload Diff */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">
              Proposed Configuration Payload (JSON)
            </span>
            <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 max-h-60">
              {JSON.stringify(request.payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>

          {request.status === 'NEEDS_INFO' && onResubmit && (
            <Button
              variant="primary"
              onClick={() => {
                onClose()
                onResubmit(request)
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Resubmit Request
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

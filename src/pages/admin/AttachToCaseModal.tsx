import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Briefcase, RefreshCw, ShieldCheck, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ipdrApi } from '@/api/ipdr'
import { extractErrorMessage } from '@/lib/axios'
import type { CaseQueryType, IPDRCaseQueryCreate } from '@/types'

interface AttachToCaseModalProps {
  isOpen: boolean
  onClose: () => void
  queryType: CaseQueryType
  parameters: Record<string, unknown>
  resultCount: number
}

export function AttachToCaseModal({
  isOpen,
  onClose,
  queryType,
  parameters,
  resultCount,
}: AttachToCaseModalProps) {
  const queryClient = useQueryClient()
  const [selectedCaseId, setSelectedCaseId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  // Load open or active cases
  const casesQuery = useQuery({
    queryKey: ['ipdr', 'attachable-cases'],
    queryFn: () => ipdrApi.listCases({ page_size: 50 }),
    enabled: isOpen,
    refetchOnWindowFocus: false,
  })

  const attachMutation = useMutation({
    mutationFn: (caseId: number) => {
      const payload: IPDRCaseQueryCreate = {
        query_type: queryType,
        query_parameters: parameters,
        result_count: resultCount,
        status: 'COMPLETED',
        notes: notes.trim() || undefined,
      }
      return ipdrApi.attachCaseQuery(caseId, payload)
    },
    onSuccess: (attachedQuery) => {
      toast.success(`Attached query to case #${attachedQuery.case_id} (Fingerprint: ${attachedQuery.query_parameters_hash.substring(0, 10)}...)`)
      queryClient.invalidateQueries({ queryKey: ['ipdr', 'cases'] })
      queryClient.invalidateQueries({ queryKey: ['ipdr', 'case', attachedQuery.case_id] })
      onClose()
      setNotes('')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to attach query to case'))
    },
  })

  if (!isOpen) return null

  const attachableCases = (casesQuery.data?.items || []).filter(
    (c) => c.status !== 'ARCHIVED' && c.status !== 'CLOSED'
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCaseId) {
      toast.error('Please select an active investigation case')
      return
    }
    attachMutation.mutate(Number(selectedCaseId))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
            <Briefcase className="h-5 w-5" />
            <span>Attach Query to Investigation Case</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold p-1"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Query Summary Box */}
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900 space-y-1">
            <span className="font-semibold text-indigo-900 dark:text-indigo-300 block uppercase text-[10px]">
              Query to Record ({queryType}):
            </span>
            <div className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
              {JSON.stringify(parameters)}
            </div>
            <div className="text-gray-500 pt-1">
              Matching Records: <strong className="text-gray-900 dark:text-white">{resultCount}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Select Active Case *
            </label>
            {casesQuery.isLoading ? (
              <div className="p-2 text-gray-400 text-xs flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Loading active cases...</span>
              </div>
            ) : attachableCases.length > 0 ? (
              <select
                required
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(Number(e.target.value))}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">-- Choose an open case --</option>
                {attachableCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} - {c.title} ({c.requesting_agency} [{c.status}])
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded text-xs">
                No active or open investigation cases found. Please create a case first in the "LEA Investigation Cases" tab.
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Investigator Notes / Findings (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Traced to subscriber account #101 active at hotel Wi-Fi hotspot..."
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={attachMutation.isPending || !selectedCaseId}
              className="inline-flex items-center gap-1.5"
            >
              {attachMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>Attach Query to Case</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

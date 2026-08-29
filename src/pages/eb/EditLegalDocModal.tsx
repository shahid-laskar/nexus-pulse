import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileText, RotateCcw, X, Loader2, BookOpen } from 'lucide-react'
import { ebApi } from '@/api/eb'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DEFAULT_LEGAL_TEMPLATES, type LegalDocTemplate } from '@/lib/legalDefaults'
import { extractErrorMessage } from '@/lib/axios'

interface EditLegalDocModalProps {
  isOpen: boolean
  customerId: number
  docType: 'tos' | 'privacy' | 'fup' | null
  currentDoc?: {
    id?: number
    doc_type: string
    title: string
    version?: number
    body_html?: string
    effective_date?: string
    requires_reacceptance?: boolean
  } | null
  onClose: () => void
}

export function EditLegalDocModal({
  isOpen,
  customerId,
  docType,
  currentDoc,
  onClose,
}: EditLegalDocModalProps) {
  const qc = useQueryClient()

  const defaultTemplate = docType ? DEFAULT_LEGAL_TEMPLATES[docType] : null

  const [title, setTitle] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [requiresReacceptance, setRequiresReacceptance] = useState(false)
  const [activeView, setActiveView] = useState<'edit' | 'preview'>('edit')

  useEffect(() => {
    if (docType) {
      const template = DEFAULT_LEGAL_TEMPLATES[docType]
      setTitle(currentDoc?.title || template.title)
      setBodyHtml(currentDoc?.body_html || template.body_html)
      setEffectiveDate(currentDoc?.effective_date || new Date().toISOString().split('T')[0])
      setRequiresReacceptance(currentDoc?.requires_reacceptance ?? false)
      setActiveView('edit')
    }
  }, [docType, currentDoc])

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!docType) return
      return await ebApi.updateLegalDoc(customerId, docType, {
        title,
        body_html: bodyHtml,
        effective_date: effectiveDate,
        requires_reacceptance: requiresReacceptance,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eb-legal-docs', customerId] })
      qc.invalidateQueries({ queryKey: ['eb-customer', customerId] })
      toast.success(`Published new version of ${title} successfully`)
      onClose()
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to publish legal document'))
    },
  })

  if (!isOpen || !docType || !defaultTemplate) return null

  const handleResetToDefault = () => {
    setTitle(defaultTemplate.title)
    setBodyHtml(defaultTemplate.body_html)
    setEffectiveDate(new Date().toISOString().split('T')[0])
    setRequiresReacceptance(false)
    toast.success('Reset to standard template')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Edit & Publish {defaultTemplate.title}
              </h3>
              <p className="text-xs text-slate-500">
                Publishes version {(currentDoc?.version ?? 0) + 1} with immutable compliance audit trail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-900 mb-1">
                Document Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Terms of Service"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">
                Effective Date
              </label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>

          {/* View Toggles & Reset */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveView('edit')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeView === 'edit'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                HTML / Text Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeView === 'preview'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Preview
              </button>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={handleResetToDefault}
              className="gap-1 text-xs"
            >
              <RotateCcw className="h-3 w-3" /> Reset to Template
            </Button>
          </div>

          {activeView === 'edit' ? (
            <div>
              <textarea
                rows={12}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 focus:ring-primary focus:border-primary bg-slate-50/50"
                placeholder="<h4>1. Section Title</h4><p>Terms content...</p>"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Supported tags: &lt;h4&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 max-h-[300px] overflow-y-auto space-y-2 prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresReacceptance}
                onChange={(e) => setRequiresReacceptance(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span>Require active users to re-accept this document before gaining network access</span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button type="button" variant="secondary" onClick={onClose} disabled={publishMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending || !title.trim() || !bodyHtml.trim()}
            className="gap-2"
          >
            {publishMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish Version {(currentDoc?.version ?? 0) + 1}
          </Button>
        </div>
      </div>
    </div>
  )
}

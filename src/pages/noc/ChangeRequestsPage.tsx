import { useState } from 'react'
import { GitPullRequest, History, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ChangeRequestsInbox } from '@/components/noc/ChangeRequestsInbox'
import { AuditLogsFeed } from '@/components/noc/AuditLogsFeed'

export function ChangeRequestsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const [activeTab, setActiveTab] = useState<'INBOX' | 'AUDIT'>('INBOX')

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Change Requests & Fleet Audit Hub"
        subtitle="Review, inspect visual diffs, approve or reject configuration changes, and track operational audit events"
        actions={
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('INBOX')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'INBOX'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              Change Requests Inbox
            </button>
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'AUDIT'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Fleet Audit Trail
            </button>
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        {activeTab === 'INBOX' ? <ChangeRequestsInbox /> : <AuditLogsFeed />}
      </div>
    </div>
  )
}

import { GitPullRequest, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ChangeRequestsInbox } from '@/components/noc/ChangeRequestsInbox'

export function ChangeRequestsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Change Requests Inbox"
        subtitle="Review, inspect visual diffs, and approve or reject customer configuration changes submitted by EB Admins"
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-[1680px]">
        <ChangeRequestsInbox />
      </div>
    </div>
  )
}

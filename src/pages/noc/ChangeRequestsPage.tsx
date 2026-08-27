import { GitPullRequest, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ChangeRequestsInbox } from '@/components/noc/ChangeRequestsInbox'

export function ChangeRequestsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Requests Inbox"
        subtitle="Review, inspect visual diffs, and approve or reject customer configuration changes submitted by EB Admins"
      />

      <ChangeRequestsInbox />
    </div>
  )
}

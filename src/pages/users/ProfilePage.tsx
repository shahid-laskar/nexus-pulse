import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'
import { extractErrorMessage } from '@/lib/axios'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

export function ProfilePage() {
  const { user: cachedUser, setUser } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: user, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const liveUser = await authApi.getMe()
      if (setUser) {
        setUser(liveUser)
      }
      return liveUser
    },
    initialData: cachedUser || undefined,
  })

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currentPassword) {
      setError('Current password is required')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success(res.message || 'Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to update password')
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading && !user) {
    return (
      <div className="space-y-6 max-w-4xl">
        <PageHeader title="My Profile & Settings" description="Manage your account details and password." />
        <PageLoader />
      </div>
    )
  }

  if (isError && !user) {
    return (
      <div className="space-y-6 max-w-4xl">
        <PageHeader title="My Profile & Settings" description="Manage your account details and password." />
        <Card>
          <CardBody className="text-sm text-red-600">
            {extractErrorMessage(queryError, 'Failed to load profile details.')}
          </CardBody>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile Settings" subtitle="Account details" />
        <div className="p-4 lg:p-8 max-w-4xl">
          <Card className="border-slate-200 shadow-2xs">
            <CardBody className="p-6 text-slate-500 text-xs">No profile details found.</CardBody>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="My Profile & Security Settings"
        subtitle="Manage your personal details, regional jurisdiction, and password credentials"
      />

      <div className="p-6 lg:p-8 max-w-5xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Details */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900">Account Identity</span>
            </CardHeader>
            <CardBody className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Username</span>
                <p className="text-slate-900 font-bold text-sm mt-0.5">{user.username}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Full Name</span>
                <p className="text-slate-800 font-semibold mt-0.5">{user.full_name || '—'}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Email Address</span>
                <p className="text-slate-800 font-mono mt-0.5">{user.email || '—'}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Assigned Role</span>
                <p className="text-slate-800 font-semibold mt-0.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                    {user.profile.role.name}
                  </span>
                </p>
              </div>
              {user.profile.circle && (
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Circle Scope</span>
                  <p className="text-slate-800 font-medium mt-0.5">{user.profile.circle.name} ({user.profile.circle.code})</p>
                </div>
              )}
              {user.profile.business_area && (
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Business Area</span>
                  <p className="text-slate-800 font-medium mt-0.5">{user.profile.business_area.name} ({user.profile.business_area.code})</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Designation</span>
                  <p className="text-slate-700 mt-0.5">{user.profile.designation || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Mobile</span>
                  <p className="text-slate-700 font-mono mt-0.5">{user.profile.mobile || '—'}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Change Password */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900">Change Password</span>
            </CardHeader>
            <CardBody className="p-5">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                    {error}
                  </div>
                )}
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <div className="pt-2">
                  <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="w-full h-8.5 text-xs">
                    Update Password
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

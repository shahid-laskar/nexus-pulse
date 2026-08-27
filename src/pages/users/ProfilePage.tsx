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
      <div>
        <PageHeader title="Profile Settings" />
        <Card><CardBody>No profile details found.</CardBody></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="My Profile & Settings" description="Manage your account details and password." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Details */}
        <Card>
          <CardHeader>Account Details</CardHeader>
          <CardBody className="space-y-4">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Username</span>
              <p className="text-foreground font-medium">{user.username}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Full Name</span>
              <p className="text-foreground font-medium">{user.full_name}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Email</span>
              <p className="text-foreground font-medium">{user.email || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Role</span>
              <p className="text-foreground font-medium">{user.profile.role.name}</p>
            </div>
            {user.profile.circle && (
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Circle</span>
                <p className="text-foreground font-medium">{user.profile.circle.name} ({user.profile.circle.code})</p>
              </div>
            )}
            {user.profile.business_area && (
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Business Area</span>
                <p className="text-foreground font-medium">{user.profile.business_area.name} ({user.profile.business_area.code})</p>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Designation</span>
              <p className="text-foreground font-medium">{user.profile.designation || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Mobile</span>
              <p className="text-foreground font-medium">{user.profile.mobile || '—'}</p>
            </div>
          </CardBody>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>Change Password</CardHeader>
          <CardBody>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
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
              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Update Password
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

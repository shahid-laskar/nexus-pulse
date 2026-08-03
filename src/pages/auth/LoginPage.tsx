import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { RoleName } from '@/types'

const ROLE_REDIRECTS: Record<RoleName, string> = {
  SUPER_ADMIN:  '/dashboard',
  CIRCLE_ADMIN: '/dashboard',
  BA_ADMIN:     '/dashboard',
  BA_NOC_ADMIN: '/noc',
  BA_EB_ADMIN:  '/eb',
  CUSTOMER:     '/login', // blocked
}

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate  = useNavigate()
  const setUser   = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await authApi.login(data)
      const role = res.user.profile.role.name as RoleName

      if (role === 'CUSTOMER') {
        toast.error('Customer accounts must use the customer portal.')
        return
      }

      setUser(res.user)
      navigate(ROLE_REDIRECTS[role] ?? '/dashboard', { replace: true })
      toast.success(`Welcome back, ${res.user.first_name || res.user.username}`)
    } catch (err: any) {
      const status = err?.response?.status
      const msg = status === 401
        ? (err.response.data?.detail ?? 'Invalid username or password')
        : status === 403
          ? (err.response.data?.detail ?? 'You are not allowed to use this portal')
          : err?.response
            ? `Login failed (${status})`
            : 'Unable to reach the server. Make sure the backend is running.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#e8b400] text-[#0a1628] font-black text-2xl mb-3">B</div>
          <h1 className="text-white text-2xl font-bold">BSNL WiFi Portal</h1>
          <p className="text-white/40 text-sm mt-1">Admin &amp; NOC Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label="Username"
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              error={errors.username?.message}
              {...register('username')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          Restricted to authorised BSNL staff only
        </p>
      </div>
    </div>
  )
}

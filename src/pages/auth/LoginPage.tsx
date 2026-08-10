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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Nexus Pulse Ambient Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-chart-2/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground font-black text-2xl mb-4 shadow-lg ring-1 ring-white/10">
            N
          </div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Nexus Pulse</h1>
          <p className="text-muted-foreground text-sm mt-1">NOC &amp; Admin Management System</p>
        </div>

        {/* Card */}
        <div className="bg-surface/80 backdrop-blur-xl border border-hairline rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Username
              </label>
              <Input
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
                error={errors.username?.message}
                {...register('username')}
                className="bg-surface-2 border-hairline focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
                className="bg-surface-2 border-hairline focus:border-primary/50 transition-colors"
              />
            </div>
            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full font-bold shadow-md shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              Secure Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground/60 text-[10px] uppercase tracking-widest mt-8 font-mono">
          Restricted to authorised personnel only
        </p>
      </div>
    </div>
  )
}

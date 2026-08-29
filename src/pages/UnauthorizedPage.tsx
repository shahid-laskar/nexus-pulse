import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function UnauthorizedPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-center p-8">
      <div className="text-6xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
      <p className="text-slate-500 mb-6 max-w-sm">
        Your role does not have permission to view this page.
      </p>
      <Button onClick={() => navigate(-1)}>← Go Back</Button>
    </div>
  )
}

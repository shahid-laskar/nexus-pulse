import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function UnauthorizedPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-8">
      <div className="text-6xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Your role does not have permission to view this page.
      </p>
      <Button onClick={() => navigate(-1)}>← Go Back</Button>
    </div>
  )
}

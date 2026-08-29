import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

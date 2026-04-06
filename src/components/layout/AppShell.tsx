import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-[#f4f6fb]">
      <Sidebar />
      <main className="ml-[240px] flex-1 flex flex-col min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}

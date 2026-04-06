import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import { AppShell }           from '@/components/layout/AppShell'
import { LoginPage }          from '@/pages/auth/LoginPage'
import { DashboardPage }      from '@/pages/dashboard/DashboardPage'
import { UsersListPage }      from '@/pages/users/UsersListPage'
import { UserCreatePage }     from '@/pages/users/UserCreatePage'
import { UserEditPage }       from '@/pages/users/UserEditPage'
import { CirclesPage }        from '@/pages/master-data/CirclesPage'
import { BusinessAreasPage }  from '@/pages/master-data/BusinessAreasPage'
import { CustomersPage }      from '@/pages/master-data/CustomersPage'
import { CustomerFormPage }   from '@/pages/master-data/CustomerFormPage'
import { CustomerDetailPage } from '@/pages/master-data/CustomerDetailPage'
import { NOCDashboardPage }   from '@/pages/noc/NOCDashboardPage'
import { OnboardPage }        from '@/pages/noc/OnboardPage'
import { SessionsPage }       from '@/pages/noc/SessionsPage'
import { EBDashboardPage }    from '@/pages/eb/EBDashboardPage'
import { EBCustomerFormPage } from '@/pages/eb/EBCustomerFormPage'
import { UnauthorizedPage }   from '@/pages/UnauthorizedPage'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry:            1,
      staleTime:        30_000,
      refetchOnWindowFocus: false,
    },
  },
})

const router = createBrowserRouter([
  // ── Public ──────────────────────────────────────────────────────────
  { path: '/login',        element: <LoginPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  // ── Protected (all inside AppShell) ─────────────────────────────────
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Dashboard
      { path: 'dashboard', element: <DashboardPage /> },

      // Users
      { path: 'users',          element: <UsersListPage /> },
      { path: 'users/create',   element: <UserCreatePage /> },
      { path: 'users/:id/edit', element: <UserEditPage /> },

      // Master data
      { path: 'circles',               element: <CirclesPage /> },
      { path: 'business-areas',        element: <BusinessAreasPage /> },
      { path: 'customers',             element: <CustomersPage /> },
      { path: 'customers/create',      element: <CustomerFormPage /> },
      { path: 'customers/:id',         element: <CustomerDetailPage /> },

      // NOC
      { path: 'noc',                              element: <NOCDashboardPage /> },
      { path: 'noc/customers/:id/onboard',        element: <OnboardPage /> },
      { path: 'noc/customers/:id/sessions',       element: <SessionsPage /> },

      // EB
      { path: 'eb',                       element: <EBDashboardPage /> },
      { path: 'eb/customers',             element: <EBDashboardPage /> },
      { path: 'eb/customers/create',      element: <EBCustomerFormPage /> },
      { path: 'eb/customers/:id/edit',    element: <EBCustomerFormPage /> },

      // Catch-all
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            fontSize: '13.5px',
          },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

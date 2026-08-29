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
import { ProfilePage }        from '@/pages/users/ProfilePage'
import { MasterDataHubPage }  from '@/pages/master-data/MasterDataHubPage'
import { CirclesPage }        from '@/pages/master-data/CirclesPage'
import { BusinessAreasPage }  from '@/pages/master-data/BusinessAreasPage'
import { CustomersPage }      from '@/pages/master-data/CustomersPage'
import { NOCDashboardPage }   from '@/pages/noc/NOCDashboardPage'
import { NOCOperationsPage }   from '@/pages/noc/NOCOperationsPage'
import { NOCProvisioningPage } from '@/pages/noc/NOCProvisioningPage'
import { RouterProposalsPage } from '@/pages/noc/RouterProposalsPage'
import { RouterProposalFormPage } from '@/pages/noc/RouterProposalFormPage'
import { RouterApprovalsPage } from '@/pages/admin/RouterApprovalsPage'
import { NocAlarmsPage }      from '@/pages/noc/NocAlarmsPage'
import { PendingRegistrationsPage } from '@/pages/noc/PendingRegistrationsPage'
import { SessionsPage }       from '@/pages/noc/SessionsPage'
import { AnalyticsPage }      from '@/pages/noc/AnalyticsPage'
import { ChangeRequestsPage }  from '@/pages/noc/ChangeRequestsPage'
import { OnboardPage }        from '@/pages/noc/OnboardPage'
import { InstancesListPage }  from '@/pages/infrastructure/InstancesListPage'
import { EBDashboardPage }    from '@/pages/eb/EBDashboardPage'
import { EBCustomerListPage } from '@/pages/eb/EBCustomerListPage'
import { EBCustomerFormPage } from '@/pages/eb/EBCustomerFormPage'
import { EBCustomerDetailPage } from '@/pages/eb/EBCustomerDetailPage'
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

      // Users & Profile
      { path: 'users',          element: <UsersListPage /> },
      { path: 'users/create',   element: <UserCreatePage /> },
      { path: 'users/:id/edit', element: <UserEditPage /> },
      { path: 'profile',        element: <ProfilePage /> },

      // Master data & Customers
      { path: 'circles',               element: <MasterDataHubPage /> },
      { path: 'business-areas',        element: <MasterDataHubPage /> },
      { path: 'customers',             element: <CustomersPage /> },
      { path: 'customers/create',      element: <EBCustomerFormPage /> },
      { path: 'customers/:id',         element: <EBCustomerDetailPage /> },
      { path: 'customers/:id/edit',    element: <EBCustomerFormPage /> },
      { path: 'admin/router-approvals', element: <RouterApprovalsPage /> },

      // NOC
      { path: 'noc',                              element: <Navigate to="/noc/operations" replace /> },
      { path: 'noc/operations',                   element: <NOCOperationsPage /> },
      { path: 'noc/provisioning',                 element: <NOCProvisioningPage /> },
      { path: 'noc/instances',                    element: <InstancesListPage /> },
      { path: 'infrastructure/instances',         element: <InstancesListPage /> },
      { path: 'noc/router-proposals',             element: <RouterProposalsPage /> },
      { path: 'noc/router-proposals/new',         element: <RouterProposalFormPage /> },
      { path: 'noc/router-proposals/:id/edit',    element: <RouterProposalFormPage /> },
      { path: 'noc/alerts',                       element: <NocAlarmsPage /> },
      { path: 'noc/change-requests',              element: <ChangeRequestsPage /> },
      { path: 'noc/registrations',                element: <PendingRegistrationsPage /> },
      { path: 'noc/sessions',                     element: <SessionsPage /> },
      { path: 'noc/analytics',                    element: <AnalyticsPage /> },
      { path: 'noc/customers/:id/onboard',        element: <OnboardPage /> },
      { path: 'noc/customers/:id/sessions',       element: <SessionsPage /> },

      // EB
      { path: 'eb',                       element: <EBDashboardPage /> },
      { path: 'eb/customers',             element: <EBCustomerListPage /> },
      { path: 'eb/customers/create',      element: <EBCustomerFormPage /> },
      { path: 'eb/customers/:id',         element: <EBCustomerDetailPage /> },
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

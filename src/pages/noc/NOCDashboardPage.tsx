import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'

export function NOCDashboardPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])

  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'noc'],
    queryFn:  () => customersApi.list({ limit: 200 }),
  })

  const customers = data?.customers ?? []
  const ready     = customers.filter(c => c.status === 'READY')
  const pushed    = customers.filter(c => c.status === 'PUSHED' || c.status === 'ACTIVE')

  return (
    <div>
      <PageHeader title="NOC Dashboard" subtitle="Router provisioning & session management" />

      <div className="p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Ready to Push"  value={ready.length}           color="yellow" sub="awaiting provisioning" />
          <StatCard label="Provisioned"    value={pushed.length}          color="green"  sub="live on router" />
          <StatCard label="Total Customers" value={customers.length}                     sub="in scope" />
        </div>

        {/* Ready queue — most important NOC task */}
        {ready.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[#1a2340] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                Awaiting Provisioning ({ready.length})
              </h2>
            </div>
            <div className="mb-6 overflow-hidden rounded-xl border border-yellow-200 bg-yellow-50">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-yellow-700 bg-yellow-100 border-b border-yellow-200">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-yellow-700 bg-yellow-100 border-b border-yellow-200">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-yellow-700 bg-yellow-100 border-b border-yellow-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ready.map(c => (
                    <tr key={c.id} className="border-b border-yellow-100 last:border-0">
                      <td className="px-4 py-3">
                        <Link to={`/customers/${c.id}`} className="font-semibold text-[#1a3a6b] hover:underline">{c.company_name}</Link>
                      </td>
                      <td className="px-4 py-3 text-xs">{c.customer_type}</td>
                      <td className="px-4 py-3">
                        <Link to={`/noc/customers/${c.id}/onboard`}>
                          <Button size="sm">Push to Router →</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* All customers */}
        <h2 className="font-bold text-[#1a2340] mb-3">All Customers</h2>
        {isLoading ? <PageLoader /> : (
          <Table>
            <thead>
              <tr>
                <Th>Company</Th><Th>Type</Th><Th>Status</Th><Th>Slug</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {!customers.length
                ? <EmptyRow cols={5} message="No customers in scope" />
                : customers.map(c => (
                  <tr key={c.id} className="hover:bg-[#fafbff]">
                    <Td>
                      <Link to={`/customers/${c.id}`} className="font-semibold text-[#1a3a6b] hover:underline">
                        {c.company_name}
                      </Link>
                    </Td>
                    <Td className="text-xs">{c.customer_type}</Td>
                    <Td><StatusBadge status={c.status} /></Td>
                    <Td>
                      {c.captive_customer_slug
                        ? <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.captive_customer_slug}</code>
                        : <span className="text-[#6b7ea8] text-xs">—</span>
                      }
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        {c.can_be_pushed && (
                          <Link to={`/noc/customers/${c.id}/onboard`}>
                            <Button size="sm">Provision</Button>
                          </Link>
                        )}
                        {c.is_pushed && (
                          <Link to={`/noc/customers/${c.id}/sessions`}>
                            <Button size="sm" variant="secondary">Sessions</Button>
                          </Link>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))
              }
            </tbody>
          </Table>
        )}
      </div>
    </div>
  )
}

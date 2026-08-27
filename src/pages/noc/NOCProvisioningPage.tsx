import { Server, Users, GitPullRequest, Layers, Network, Sliders } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export function NOCProvisioningPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])

  const placeholders = [
    {
      title: 'VyOS Instances',
      icon: Server,
      description: 'Fleet overview of edge routers and instance provisioning status.',
    },
    {
      title: 'Customer Onboarding Queue',
      icon: Users,
      description: 'Staged enterprise customers awaiting multi-step onboarding and push.',
    },
    {
      title: 'EB Change Requests',
      icon: GitPullRequest,
      description: 'Pending configuration modifications from enterprise business admins.',
    },
    {
      title: 'VLAN Overview',
      icon: Network,
      description: 'SVLAN and CVLAN pool utilization across circle business areas.',
    },
    {
      title: 'Interface Setup',
      icon: Sliders,
      description: 'Automated QinQ interface configuration and pre-flight validation.',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provisioning Dashboard"
        subtitle="Manage VyOS instance provisioning, customer onboarding queue, VLAN allocations & change requests"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {placeholders.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-[11.5px] text-slate-500">{item.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="pt-2">
                <div className="rounded-lg bg-slate-50 p-4 border border-dashed border-slate-300 text-center">
                  <p className="text-xs font-semibold text-slate-500 font-mono">
                    Coming in Sprint 4 wiring task
                  </p>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

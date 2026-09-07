import { BadgeIndianRupee, Plus, Users, TrendingUp, Layers } from 'lucide-react'
import { PageHeader, PageBody } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { KpiRow, StatePill, inr } from '@/components/admin/AdminKit'
import { PLANS } from '@/lib/commercial-data'
import { cn } from '@/lib/utils'

export function PlansPage() {
  const subscribers = PLANS.reduce((s, p) => s + p.subscribers, 0)
  const revenue = PLANS.reduce((s, p) => s + p.revenue, 0)
  const activePlans = PLANS.filter((p) => p.status === 'active').length
  const arpu = Math.round(revenue / subscribers)

  return (
    <>
      <PageHeader
        title="Plans & Tariffs"
        subtitle="Package catalogue, FUP policy and commercial performance for every tariff."
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> New plan
          </Button>
        }
      />
      <PageBody>
        <KpiRow>
          <StatCard label="Active plans" value={activePlans} color="blue" icon={Layers} sub={`${PLANS.length} in catalogue`} />
          <StatCard label="Subscribers" value={subscribers.toLocaleString('en-IN')} color="green" icon={Users} delta={3.4} />
          <StatCard label="Monthly revenue" value={inr(revenue)} color="emerald" icon={TrendingUp} delta={7.1} />
          <StatCard label="ARPU" value={inr(arpu)} icon={BadgeIndianRupee} sub="per subscriber" />
        </KpiRow>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PLANS.map((p) => (
            <Card key={p.id} className={cn(p.featured && 'border-primary/50')}>
              <CardHeader actions={<StatePill state={p.status} />}>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>
                  {p.speed} · {p.fup} · {p.validity}
                </CardDescription>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold tnum tracking-tight text-foreground">{inr(p.price)}</span>
                  <span className="text-[11.5px] text-muted-foreground">/ {p.validity}</span>
                </div>
                <dl className="grid grid-cols-3 gap-2 border-t border-hairline pt-3">
                  <div>
                    <dt className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Devices</dt>
                    <dd className="tnum text-[13px] font-medium">{p.devices}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Subs</dt>
                    <dd className="tnum text-[13px] font-medium">{p.subscribers.toLocaleString('en-IN')}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Revenue</dt>
                    <dd className="tnum text-[13px] font-medium">{inr(p.revenue)}</dd>
                  </div>
                </dl>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1">Edit</Button>
                  <Button variant="ghost" size="sm" className="flex-1">Duplicate</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Plan</Th>
              <Th>Speed</Th>
              <Th>FUP</Th>
              <Th>Validity</Th>
              <Th align="right">Price</Th>
              <Th align="right">Subscribers</Th>
              <Th align="right">Revenue</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {PLANS.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td>{p.speed}</Td>
                <Td>{p.fup}</Td>
                <Td>{p.validity}</Td>
                <Td align="right">{inr(p.price)}</Td>
                <Td align="right">{p.subscribers.toLocaleString('en-IN')}</Td>
                <Td align="right">{inr(p.revenue)}</Td>
                <Td><StatePill state={p.status} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </PageBody>
    </>
  )
}

import { useMemo, useState } from 'react'
import { Search, Wifi, WifiOff, Activity, Plus, RefreshCw } from 'lucide-react'
import { PageHeader, PageBody } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, Th, Td, Tr, EmptyRow } from '@/components/ui/Table'
import { FilterBar, KpiRow, StatePill, UsageBar } from '@/components/admin/AdminKit'
import { HOTSPOTS } from '@/lib/commercial-data'

export function HotspotsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [circle, setCircle] = useState('all')

  const circles = useMemo(
    () => Array.from(new Set(HOTSPOTS.map((h) => h.circle))).sort(),
    []
  )

  const rows = useMemo(
    () =>
      HOTSPOTS.filter((h) => {
        const text = `${h.name} ${h.id} ${h.ssid} ${h.circle}`.toLowerCase()
        return (
          (status === 'all' || h.status === status) &&
          (circle === 'all' || h.circle === circle) &&
          text.includes(q.trim().toLowerCase())
        )
      }),
    [q, status, circle]
  )

  const online = HOTSPOTS.filter((h) => h.status === 'online').length
  const offline = HOTSPOTS.filter((h) => h.status === 'offline').length
  const clients = HOTSPOTS.reduce((s, h) => s + h.clients, 0)
  const avgUtil = Math.round(HOTSPOTS.reduce((s, h) => s + h.utilisation, 0) / HOTSPOTS.length)

  return (
    <>
      <PageHeader
        title="Hotspots & Access Points"
        subtitle="Fleet health, live client load and utilisation across every deployed venue."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> Add hotspot
            </Button>
          </>
        }
      />
      <PageBody>
        <KpiRow>
          <StatCard label="Online APs" value={online} color="green" icon={Wifi} sub={`of ${HOTSPOTS.length} deployed`} />
          <StatCard label="Offline" value={offline} color="red" icon={WifiOff} sub="needs field visit" />
          <StatCard label="Connected clients" value={clients.toLocaleString('en-IN')} color="blue" icon={Activity} delta={4.2} />
          <StatCard label="Avg utilisation" value={`${avgUtil}%`} color={avgUtil > 70 ? 'amber' : 'default'} sub="radio airtime" />
        </KpiRow>

        <FilterBar>
          <div className="w-full max-w-xs">
            <Input
              placeholder="Search venue, AP ID or SSID"
              icon={<Search />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'online', label: 'Online' },
                { value: 'degraded', label: 'Degraded' },
                { value: 'offline', label: 'Offline' },
              ]}
            />
          </div>
          <div className="w-44">
            <Select
              value={circle}
              onChange={(e) => setCircle(e.target.value)}
              options={[{ value: 'all', label: 'All circles' }, ...circles.map((c) => ({ value: c, label: c }))]}
            />
          </div>
          <span className="ml-auto text-[11.5px] text-muted-foreground tnum">
            {rows.length} of {HOTSPOTS.length} access points
          </span>
        </FilterBar>

        <Table>
          <thead>
            <tr>
              <Th>Access point</Th>
              <Th>Circle</Th>
              <Th>SSID</Th>
              <Th>Status</Th>
              <Th align="right">Clients</Th>
              <Th>Utilisation</Th>
              <Th align="right">Uptime</Th>
              <Th>Firmware</Th>
              <Th align="right">Last seen</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={9} message="No access points match these filters." />
            ) : (
              rows.map((h) => (
                <Tr key={h.id}>
                  <Td>
                    <span className="font-medium text-foreground">{h.name}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">{h.id}</span>
                  </Td>
                  <Td>{h.circle}</Td>
                  <Td>{h.ssid}</Td>
                  <Td><StatePill state={h.status} /></Td>
                  <Td align="right">{h.clients}</Td>
                  <Td><UsageBar value={h.utilisation} /></Td>
                  <Td align="right">{h.uptime}%</Td>
                  <Td>{h.firmware}</Td>
                  <Td align="right" className="text-muted-foreground">{h.lastSeen}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </PageBody>
    </>
  )
}

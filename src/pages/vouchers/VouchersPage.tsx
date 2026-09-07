import { useMemo, useState } from 'react'
import { Search, Ticket, CheckCircle2, Clock, Plus, Download } from 'lucide-react'
import { PageHeader, PageBody } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, Th, Td, Tr, EmptyRow } from '@/components/ui/Table'
import { FilterBar, KpiRow, StatePill, inr } from '@/components/admin/AdminKit'
import { VOUCHERS } from '@/lib/commercial-data'

export function VouchersPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [batch, setBatch] = useState('all')

  const batches = useMemo(() => Array.from(new Set(VOUCHERS.map((v) => v.batch))).sort(), [])

  const rows = useMemo(
    () =>
      VOUCHERS.filter(
        (v) =>
          (status === 'all' || v.status === status) &&
          (batch === 'all' || v.batch === batch) &&
          `${v.code} ${v.plan} ${v.issuedTo}`.toLowerCase().includes(q.trim().toLowerCase())
      ),
    [q, status, batch]
  )

  const redeemed = VOUCHERS.filter((v) => v.status === 'redeemed').length
  const active = VOUCHERS.filter((v) => v.status === 'active').length
  const unused = VOUCHERS.filter((v) => v.status === 'unused').length
  const value = VOUCHERS.filter((v) => v.status !== 'expired').reduce((s, v) => s + v.value, 0)

  return (
    <>
      <PageHeader
        title="Vouchers & Codes"
        subtitle="Issue, track and reconcile prepaid access codes across retail and reseller channels."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Download className="h-3.5 w-3.5" /> Export batch
            </Button>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> Generate vouchers
            </Button>
          </>
        }
      />
      <PageBody>
        <KpiRow>
          <StatCard label="In circulation" value={active + unused} color="blue" icon={Ticket} sub={`${unused} never used`} />
          <StatCard label="Redeemed" value={redeemed} color="green" icon={CheckCircle2} delta={6.8} />
          <StatCard label="Expiring soon" value={VOUCHERS.filter((v) => v.status === 'active').length} color="amber" icon={Clock} sub="within 30 days" />
          <StatCard label="Open value" value={inr(value)} sub="unredeemed liability" />
        </KpiRow>

        <FilterBar>
          <div className="w-full max-w-xs">
            <Input placeholder="Search code, plan or channel" icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="w-40">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'unused', label: 'Unused' },
                { value: 'active', label: 'Active' },
                { value: 'redeemed', label: 'Redeemed' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
          </div>
          <div className="w-48">
            <Select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              options={[{ value: 'all', label: 'All batches' }, ...batches.map((b) => ({ value: b, label: b }))]}
            />
          </div>
          <span className="ml-auto text-[11.5px] text-muted-foreground tnum">{rows.length} vouchers</span>
        </FilterBar>

        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Batch</Th>
              <Th>Plan</Th>
              <Th>Channel</Th>
              <Th>Status</Th>
              <Th align="right">Value</Th>
              <Th>Created</Th>
              <Th>Expires</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={8} message="No vouchers match these filters." />
            ) : (
              rows.map((v) => (
                <Tr key={v.code}>
                  <Td className="font-mono text-[11.5px] font-medium">{v.code}</Td>
                  <Td className="text-muted-foreground">{v.batch}</Td>
                  <Td>{v.plan}</Td>
                  <Td className="text-muted-foreground">{v.issuedTo}</Td>
                  <Td><StatePill state={v.status} /></Td>
                  <Td align="right">{inr(v.value)}</Td>
                  <Td className="text-muted-foreground">{v.createdAt}</Td>
                  <Td className="text-muted-foreground">{v.expiresAt}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </PageBody>
    </>
  )
}

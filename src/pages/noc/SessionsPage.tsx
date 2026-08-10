import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { nocApi } from '@/api/noc'
import { customersApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { BandwidthProfileRead, SessionRead, ConntrackRecord, CustomerRead } from '@/types'

export function SessionsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const { id } = useParams<{ id?: string }>()
  const customerId = id ? Number(id) : null

  if (!customerId) {
    return <CustomerSelectorForSessions />
  }

  return <CustomerSessionsView customerId={customerId} />
}

function CustomerSelectorForSessions() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'pushed-only'],
    queryFn: () => customersApi.list({ limit: 200 }),
  })

  const pushedCustomers = (data?.customers || []).filter(c => c.is_pushed)

  return (
    <div>
      <PageHeader title="NOC Sessions & Router Diagnostics" subtitle="Select a provisioned customer to view live sessions and router controls." />
      <div className="p-8">
        <h2 className="font-bold text-foreground mb-3">Provisioned Customers</h2>
        {isLoading ? <PageLoader /> : (
          <Table>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>GSTIN</Th>
                <Th>Captive Slug</Th>
                <Th>Instance</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {!pushedCustomers.length ? (
                <EmptyRow cols={5} message="No provisioned customers available." />
              ) : (
                pushedCustomers.map((c: CustomerRead) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td className="font-semibold text-foreground">{c.company_name}</Td>
                    <Td className="font-mono text-xs text-slate-700">{c.gstin}</Td>
                    <Td><code className="text-xs bg-surface-2 text-foreground border border-hairline px-1.5 py-0.5 rounded font-mono">{c.captive_customer_slug}</code></Td>
                    <Td className="text-xs text-slate-600">Instance #{c.captive_instance_id}</Td>
                    <Td>
                      <Link to={`/noc/customers/${c.id}/sessions`}>
                        <Button size="sm">Open Operational Controls →</Button>
                      </Link>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  )
}

function CustomerSessionsView({ customerId }: { customerId: number }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'sessions' | 'conntrack' | 'status' | 'bandwidth'>('sessions')

  const [confirmFlushSessions, setConfirmFlushSessions] = useState(false)
  const [confirmFlushConntrack, setConfirmFlushConntrack] = useState(false)
  const [disconnectIp, setDisconnectIp] = useState<string | null>(null)
  const [selectedStats, setSelectedStats] = useState<Record<string, unknown> | null>(null)
  const [editingTcMaxBandwidth, setEditingTcMaxBandwidth] = useState('')

  // Queries
  const { data: customer } = useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => customersApi.get(customerId),
  })

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['noc-sessions', customerId],
    queryFn: () => nocApi.listSessions(customerId),
    refetchInterval: 10_000,
  })

  const { data: profilesData } = useQuery({
    queryKey: ['noc-profiles', customerId],
    queryFn: () => nocApi.listProfiles(customerId),
  })

  const { data: conntrackData, isLoading: loadingConntrack } = useQuery({
    queryKey: ['noc-conntrack', customerId],
    queryFn: () => nocApi.listConntrack(customerId),
    enabled: activeTab === 'conntrack',
  })

  const { data: nftablesStatus } = useQuery({
    queryKey: ['noc-nftables', customerId],
    queryFn: () => nocApi.getNftablesStatus(customerId),
    enabled: activeTab === 'status',
  })

  const { data: tcStatus } = useQuery({
    queryKey: ['noc-tc', customerId],
    queryFn: () => nocApi.getTCStatus(customerId),
    enabled: activeTab === 'status',
  })

  const { data: authFailures, isLoading: loadingAuth } = useQuery({
    queryKey: ['noc-auth', customerId],
    queryFn: () => nocApi.getAuthFailures(customerId),
    enabled: activeTab === ('auth' as any),
  })

  // Mutations
  const flushSessions = useMutation({
    mutationFn: () => nocApi.flushSessions(customerId),
    onSuccess: (res) => {
      toast.success(res.message || 'All sessions flushed')
      qc.invalidateQueries({ queryKey: ['noc-sessions', customerId] })
      setConfirmFlushSessions(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to flush sessions')),
  })

  const flushConntrack = useMutation({
    mutationFn: () => nocApi.flushConntrack(customerId),
    onSuccess: (res) => {
      toast.success(res.message || 'Conntrack connections flushed')
      qc.invalidateQueries({ queryKey: ['noc-conntrack', customerId] })
      setConfirmFlushConntrack(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to flush conntrack')),
  })

  const disconnectSession = useMutation({
    mutationFn: (ip: string) => nocApi.disconnectSession(customerId, ip),
    onSuccess: () => {
      toast.success(`Disconnected ${disconnectIp}`)
      qc.invalidateQueries({ queryKey: ['noc-sessions', customerId] })
      setDisconnectIp(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to disconnect session')),
  })

  const updateTcBandwidth = useMutation({
    mutationFn: (bw: string) => nocApi.updateTCMaxBandwidth(customerId, bw),
    onSuccess: () => {
      toast.success('TC maximum bandwidth updated')
      qc.invalidateQueries({ queryKey: ['noc-tc', customerId] })
      qc.invalidateQueries({ queryKey: ['customers', customerId] })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to update TC bandwidth')),
  })

  const profiles: BandwidthProfileRead[] = profilesData?.profiles || profilesData?.bandwidth_profiles || []

  return (
    <div>
      <PageHeader
        title={`Operational Control — ${customer?.company_name || `Customer #${customerId}`}`}
        subtitle={`Instance #${customer?.captive_instance_id ?? '—'} · Slug: ${customer?.captive_customer_slug ?? '—'}`}
        actions={
          <div className="flex gap-2">
            <Link to="/noc"><Button variant="secondary" size="sm">← Back to NOC</Button></Link>
            <Button variant="secondary" size="sm" onClick={() => setConfirmFlushConntrack(true)}>
              🧹 Flush Conntrack
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmFlushSessions(true)}>
              ⚠️ Flush All Sessions
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'sessions' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            ⚡ Active Sessions ({sessions?.session_count ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('conntrack')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'conntrack' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            🔌 Conntrack Connections ({conntrackData?.connection_count ?? '—'})
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'status' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            🛡️ Router Firewall & TC Status
          </button>
          <button
            onClick={() => setActiveTab('auth' as any)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === ('auth' as any) ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            🚫 Auth Rejections
          </button>
        </div>

        {/* Tab 1: Sessions */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Auto-refreshing every 10s</span>
              <span>Loaded Profiles: {profiles.length}</span>
            </div>

            {loadingSessions ? <PageLoader /> : (
              <Table>
                <thead>
                  <tr>
                    <Th>IP Address</Th>
                    <Th>Timeout Remaining</Th>
                    <Th>QoS Provisioning</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {!sessions?.sessions.length ? (
                    <EmptyRow cols={4} message="No active sessions found for this customer." />
                  ) : (
                    sessions.sessions.map((s: SessionRead) => (
                      <tr key={s.ip} className="hover:bg-slate-50">
                        <Td><code className="font-mono text-sm text-foreground font-semibold">{s.ip}</code></Td>
                        <Td className="text-sm text-slate-600">
                          {s.timeout_remaining != null ? `${s.timeout_remaining}s` : 'Unlimited / None'}
                        </Td>
                        <Td>
                          <QoSControlInline
                            customerId={customerId}
                            ip={s.ip}
                            profiles={profiles}
                            onShowStats={(stats) => setSelectedStats(stats)}
                          />
                        </Td>
                        <Td>
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => setDisconnectIp(s.ip)}
                          >
                            Disconnect
                          </Button>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 2: Conntrack */}
        {activeTab === 'conntrack' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground">Active Conntrack Table</h3>
              <Button size="sm" variant="secondary" onClick={() => setConfirmFlushConntrack(true)}>
                Flush Conntrack
              </Button>
            </div>
            {loadingConntrack ? <PageLoader /> : (
              <Table>
                <thead>
                  <tr>
                    <Th>Source IP</Th>
                    <Th>Source Port</Th>
                    <Th>Destination IP</Th>
                    <Th>Destination Port</Th>
                  </tr>
                </thead>
                <tbody>
                  {!conntrackData?.connections?.length ? (
                    <EmptyRow cols={4} message="No conntrack connections recorded." />
                  ) : (
                    conntrackData.connections.map((c: ConntrackRecord, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 font-mono text-xs">
                        <Td>{c.src_ip || '—'}</Td>
                        <Td>{c.src_port ?? '—'}</Td>
                        <Td>{c.dst_ip || '—'}</Td>
                        <Td>{c.dst_port ?? '—'}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 3: Status (Nftables & TC) */}
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-foreground">TC Traffic Control Status</h3>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-slate-500">Max: {customer?.max_bandwidth}</span>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="New max bw e.g. 1gbit"
                    value={editingTcMaxBandwidth}
                    onChange={(e) => setEditingTcMaxBandwidth(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                  />
                  <Button
                    size="xs"
                    disabled={!editingTcMaxBandwidth}
                    isLoading={updateTcBandwidth.isPending}
                    onClick={() => updateTcBandwidth.mutate(editingTcMaxBandwidth)}
                  >
                    Update Max Bandwidth
                  </Button>
                </div>
                <pre className="bg-slate-900 text-green-400 p-3 rounded text-xs font-mono overflow-auto max-h-96">
                  {JSON.stringify(tcStatus?.status || tcStatus || 'Loading TC status...', null, 2)}
                </pre>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>Nftables Firewall Rules Status</CardHeader>
              <CardBody>
                <pre className="bg-slate-900 text-green-400 p-3 rounded text-xs font-mono overflow-auto max-h-96">
                  {JSON.stringify(nftablesStatus?.status || nftablesStatus || 'Loading Nftables status...', null, 2)}
                </pre>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Modals & Dialogs */}
        <ConfirmDialog
          isOpen={confirmFlushSessions}
          title="Flush ALL Sessions?"
          description="Are you sure you want to flush all active sessions for this customer? Every connected user will be immediately disconnected."
          confirmText="Flush All Sessions"
          variant="danger"
          isLoading={flushSessions.isPending}
          onConfirm={() => flushSessions.mutate()}
          onClose={() => setConfirmFlushSessions(false)}
        />

        <ConfirmDialog
          isOpen={confirmFlushConntrack}
          title="Flush Conntrack Connections?"
          description="Are you sure you want to flush connection tracking entries for this customer?"
          confirmText="Flush Conntrack"
          variant="warning"
          isLoading={flushConntrack.isPending}
          onConfirm={() => flushConntrack.mutate()}
          onClose={() => setConfirmFlushConntrack(false)}
        />

        <ConfirmDialog
          isOpen={Boolean(disconnectIp)}
          title={`Disconnect IP ${disconnectIp}?`}
          description={`Are you sure you want to disconnect active session for IP address ${disconnectIp}?`}
          confirmText="Disconnect"
          variant="danger"
          isLoading={disconnectSession.isPending}
          onConfirm={() => disconnectIp && disconnectSession.mutate(disconnectIp)}
          onClose={() => setDisconnectIp(null)}
        />

        {/* Stats Modal / Panel */}
        {selectedStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-surface rounded-lg p-6 max-w-lg w-full shadow-xl">
              <h3 className="text-lg font-bold text-foreground mb-2">QoS Statistics</h3>
              <pre className="bg-surface-2 text-foreground border border-hairline p-4 rounded text-xs font-mono overflow-auto max-h-64 mb-4">
                {JSON.stringify(selectedStats, null, 2)}
              </pre>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setSelectedStats(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Auth Rejections */}
        {activeTab === ('auth' as any) && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground">Recent Radius Authentication Failures</h3>
            </div>
            {loadingAuth ? <PageLoader /> : (
              <Table>
                <thead>
                  <tr>
                    <Th>Time</Th>
                    <Th>Username</Th>
                    <Th>MAC Address</Th>
                    <Th>Reply</Th>
                    <Th>Reason</Th>
                  </tr>
                </thead>
                <tbody>
                  {!authFailures?.failures?.length ? (
                    <EmptyRow cols={5} message="No recent authentication failures recorded." />
                  ) : (
                    authFailures.failures.map((f: any) => (
                      <tr key={f.id} className="hover:bg-slate-50 text-sm">
                        <Td className="whitespace-nowrap text-xs text-slate-500">{new Date(f.auth_date).toLocaleString()}</Td>
                        <Td className="font-semibold text-slate-800">{f.username}</Td>
                        <Td className="font-mono text-xs">{f.mac_address}</Td>
                        <Td><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">{f.reply}</span></Td>
                        <Td className="text-slate-600">{f.reason}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </div>
        )}

      </div>

    </div>
  )
}

function QoSControlInline({
  customerId,
  ip,
  profiles,
  onShowStats,
}: {
  customerId: number
  ip: string
  profiles: BandwidthProfileRead[]
  onShowStats: (stats: Record<string, unknown>) => void
}) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    profiles.length > 0 ? String(profiles[0].id) : ''
  )

  const provision = useMutation({
    mutationFn: () => nocApi.provisionQoS(customerId, ip, Number(selectedProfileId)),
    onSuccess: (res) => toast.success(res.message || `QoS provisioned for ${ip}`),
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to provision QoS')),
  })

  const remove = useMutation({
    mutationFn: () => nocApi.removeQoS(customerId, ip, Number(selectedProfileId)),
    onSuccess: (res) => toast.success(res.message || `QoS removed for ${ip}`),
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to remove QoS')),
  })

  const getStats = useMutation({
    mutationFn: () => nocApi.getQoSStats(customerId, ip, Number(selectedProfileId)),
    onSuccess: (data) => onShowStats(data.stats || data),
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to fetch QoS stats')),
  })

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {profiles.length > 0 ? (
        <select
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          className="text-xs border border-slate-300 rounded px-2 py-1 font-medium bg-surface"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.rate ? `(${p.rate})` : ''}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          placeholder="Profile ID"
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          className="w-20 text-xs border border-slate-300 rounded px-2 py-1 font-mono"
        />
      )}

      <Button
        size="xs"
        disabled={!selectedProfileId}
        isLoading={provision.isPending}
        onClick={() => provision.mutate()}
      >
        Apply QoS
      </Button>
      <Button
        size="xs"
        variant="danger"
        disabled={!selectedProfileId}
        isLoading={remove.isPending}
        onClick={() => remove.mutate()}
      >
        Remove QoS
      </Button>
      <Button
        size="xs"
        variant="secondary"
        disabled={!selectedProfileId}
        isLoading={getStats.isPending}
        onClick={() => getStats.mutate()}
      >
        Stats
      </Button>
    </div>
  )
}

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
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { BandwidthProfileRead, SessionRead, ConntrackRecord, CustomerRead, UpstreamUserRead } from '@/types'

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

type TabType = 'sessions' | 'conntrack' | 'status' | 'auth' | 'users' | 'config'

function CustomerSessionsView({ customerId }: { customerId: number }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('sessions')

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
        <div className="flex border-b border-slate-200 gap-2 flex-wrap">
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
            onClick={() => setActiveTab('auth')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'auth' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            🚫 Auth Rejections
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'users' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            👥 Upstream Users
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'config' ? 'border-[#004aad] text-[#004aad]' : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            ⚙️ Upstream Config
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
        {activeTab === 'auth' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground">Recent Authentication Failures</h3>
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

        {/* Tab 5: Upstream Captive Users */}
        {activeTab === 'users' && (
          <UpstreamUsersTab customerId={customerId} profiles={profiles} />
        )}

        {/* Tab 6: Upstream Router Config */}
        {activeTab === 'config' && (
          <UpstreamConfigTab customerId={customerId} customer={customer} />
        )}

      </div>

    </div>
  )
}

function UpstreamUsersTab({
  customerId,
  profiles,
}: {
  customerId: number
  profiles: BandwidthProfileRead[]
}) {
  const qc = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UpstreamUserRead | null>(null)
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    profile: profiles.length > 0 ? profiles[0].name : '',
    status: 'active',
  })

  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    profile: '',
    status: 'active',
    new_password: '',
  })

  const { data: usersData, isLoading, isError, error } = useQuery({
    queryKey: ['noc-upstream-users', customerId],
    queryFn: () => nocApi.listUpstreamUsers(customerId),
  })

  const users: UpstreamUserRead[] = Array.isArray(usersData)
    ? usersData
    : (usersData?.users || [])

  const createMutation = useMutation({
    mutationFn: (payload: any) => nocApi.createUpstreamUser(customerId, payload),
    onSuccess: () => {
      toast.success('Captive user created successfully')
      qc.invalidateQueries({ queryKey: ['noc-upstream-users', customerId] })
      setIsCreateOpen(false)
      setCreateForm({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
        profile: profiles.length > 0 ? profiles[0].name : '',
        status: 'active',
      })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to create captive user')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ username, payload }: { username: string; payload: any }) =>
      nocApi.updateUpstreamUser(customerId, username, payload),
    onSuccess: () => {
      toast.success('Captive user updated successfully')
      qc.invalidateQueries({ queryKey: ['noc-upstream-users', customerId] })
      setEditingUser(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to update captive user')),
  })

  const deleteMutation = useMutation({
    mutationFn: (username: string) => nocApi.deleteUpstreamUser(customerId, username),
    onSuccess: () => {
      toast.success(`User ${deletingUsername} deleted`)
      qc.invalidateQueries({ queryKey: ['noc-upstream-users', customerId] })
      setDeletingUsername(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to delete captive user')),
  })

  const handleOpenEdit = (u: UpstreamUserRead) => {
    setEditingUser(u)
    setEditForm({
      full_name: u.full_name || '',
      email: u.email || '',
      phone: u.phone || '',
      profile: u.profile || (profiles.length > 0 ? profiles[0].name : ''),
      status: u.status || 'active',
      new_password: '',
    })
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.username || !createForm.password) {
      toast.error('Username and password are required')
      return
    }
    createMutation.mutate(createForm)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    const payload: any = {
      full_name: editForm.full_name,
      email: editForm.email,
      phone: editForm.phone,
      profile: editForm.profile,
      status: editForm.status,
    }
    if (editForm.new_password) {
      payload.password = editForm.new_password
    }
    updateMutation.mutate({ username: editingUser.username, payload })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-foreground">Captive Portal User Administration</h3>
          <p className="text-xs text-muted-foreground">Manage user credentials and accounts provisioned on this customer's captive portal router instance.</p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          ➕ Add Captive User
        </Button>
      </div>

      {isLoading ? <PageLoader /> : isError ? (
        <Card>
          <CardBody className="text-sm text-red-600">
            {extractErrorMessage(error, 'Failed to fetch captive users.')}
          </CardBody>
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Username</Th>
              <Th>Full Name / Email</Th>
              <Th>Phone</Th>
              <Th>Bandwidth Profile</Th>
              <Th>Status</Th>
              <Th>Usage</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {!users.length ? (
              <EmptyRow cols={7} message="No captive portal users found for this customer." />
            ) : (
              users.map((u) => (
                <tr key={u.username} className="hover:bg-slate-50 text-sm">
                  <Td className="font-mono font-semibold text-foreground">{u.username}</Td>
                  <Td>
                    <div className="font-medium text-foreground">{u.full_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{u.email || '—'}</div>
                  </Td>
                  <Td className="font-mono text-xs">{u.phone || '—'}</Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-2 border border-hairline">
                      {u.profile || 'Default'}
                    </span>
                  </Td>
                  <Td>
                    <Badge
                      label={u.status || 'ACTIVE'}
                      variant={u.status === 'active' || !u.status ? 'success' : 'warning'}
                    />
                  </Td>
                  <Td className="text-xs text-muted-foreground font-mono">
                    {u.usage?.data_used_mb != null ? `${u.usage.data_used_mb} MB` : '0 MB'}
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button size="xs" variant="secondary" onClick={() => handleOpenEdit(u)}>
                        Edit
                      </Button>
                      <Button size="xs" variant="danger" onClick={() => setDeletingUsername(u.username)}>
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full shadow-xl border border-hairline">
            <h3 className="text-lg font-bold text-foreground mb-4">Create Captive Portal User</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <Input
                label="Username"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                required
                placeholder="e.g. jdoe"
              />
              <Input
                label="Password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
                placeholder="Minimum 6 characters"
              />
              <Input
                label="Full Name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="e.g. John Doe"
              />
              <Input
                label="Email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@domain.com"
              />
              <Input
                label="Phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="10-digit mobile"
              />
              {profiles.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Bandwidth Profile
                  </label>
                  <select
                    value={createForm.profile}
                    onChange={(e) => setCreateForm({ ...createForm, profile: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-surface text-foreground"
                  >
                    {profiles.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} {p.rate ? `(${p.rate})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={createMutation.isPending}>
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full shadow-xl border border-hairline">
            <h3 className="text-lg font-bold text-foreground mb-4">Edit User: {editingUser.username}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <Input
                label="Full Name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <Input
                label="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              <Input
                label="Reset Password (optional)"
                type="password"
                placeholder="Leave blank to keep current password"
                value={editForm.new_password}
                onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
              />
              {profiles.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Bandwidth Profile
                  </label>
                  <select
                    value={editForm.profile}
                    onChange={(e) => setEditForm({ ...editForm, profile: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-surface text-foreground"
                  >
                    {profiles.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} {p.rate ? `(${p.rate})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="secondary" size="sm" onClick={() => setEditingUser(null)} disabled={updateMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={updateMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletingUsername)}
        title={`Delete User "${deletingUsername}"?`}
        description={`Are you sure you want to permanently delete captive portal user "${deletingUsername}"? The user will immediately lose access.`}
        confirmText="Delete User"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingUsername && deleteMutation.mutate(deletingUsername)}
        onClose={() => setDeletingUsername(null)}
      />
    </div>
  )
}

function UpstreamConfigTab({
  customerId,
  customer,
}: {
  customerId: number
  customer?: CustomerRead
}) {
  const qc = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [configText, setConfigText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)

  const { data: config, isLoading, isError, error } = useQuery({
    queryKey: ['noc-upstream-customer', customerId],
    queryFn: () => nocApi.getUpstreamCustomer(customerId),
  })

  const startEditing = () => {
    setConfigText(JSON.stringify(config, null, 2))
    setJsonError(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setJsonError(null)
  }

  const handlePreSave = () => {
    try {
      JSON.parse(configText)
      setJsonError(null)
      setConfirmSave(true)
    } catch (e: any) {
      setJsonError(`Invalid JSON: ${e.message}`)
    }
  }

  const updateConfig = useMutation({
    mutationFn: (payload: any) => nocApi.updateUpstreamCustomer(customerId, payload),
    onSuccess: () => {
      toast.success('Upstream customer configuration updated on router')
      qc.invalidateQueries({ queryKey: ['noc-upstream-customer', customerId] })
      setIsEditing(false)
      setConfirmSave(false)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to update upstream configuration'))
    },
  })

  const handleConfirmSave = () => {
    try {
      const payload = JSON.parse(configText)
      updateConfig.mutate(payload)
    } catch (e: any) {
      setJsonError(`Invalid JSON: ${e.message}`)
      setConfirmSave(false)
    }
  }

  if (isLoading) return <PageLoader />
  if (isError) {
    return (
      <Card>
        <CardBody className="text-sm text-red-600">
          {extractErrorMessage(error, 'Failed to fetch upstream configuration.')}
        </CardBody>
      </Card>
    )
  }

  const customerObj = config?.customer || config

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-foreground">Upstream Customer Configuration (VyOS / Captive Portal)</h3>
          <p className="text-xs text-muted-foreground">
            Direct customer state stored on router instance #{customer?.captive_instance_id ?? '—'} (Slug: {customer?.captive_customer_slug ?? '—'})
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button size="sm" onClick={startEditing}>
              ✏️ Edit Configuration
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={cancelEditing} disabled={updateConfig.isPending}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={handlePreSave} isLoading={updateConfig.isPending}>
                💾 Save to Router
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>Edit Raw JSON Configuration</CardHeader>
          <CardBody className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded">
              ⚠️ <strong>Warning:</strong> Updating this configuration writes directly to the router instance database. Ensure all fields (network, interface, limits) remain valid.
            </div>
            {jsonError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-mono">
                {jsonError}
              </div>
            )}
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={22}
              className="w-full font-mono text-xs p-3 rounded-lg border border-hairline bg-slate-900 text-green-400 outline-none focus:border-primary"
              spellCheck={false}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>Live Router Configuration Summary</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono mb-4">
                <div className="p-3 bg-surface-2 rounded border border-hairline">
                  <span className="text-muted-foreground block uppercase text-[10px] font-bold">Slug</span>
                  <span className="font-semibold text-foreground">{customerObj?.slug || customerObj?.user_account || '—'}</span>
                </div>
                <div className="p-3 bg-surface-2 rounded border border-hairline">
                  <span className="text-muted-foreground block uppercase text-[10px] font-bold">WAN / QinQ Interface</span>
                  <span className="font-semibold text-foreground">{customerObj?.network?.wan_interface || customerObj?.wan_interface || '—'} / {customerObj?.network?.qinq_interface || customerObj?.qinq_interface || '—'}</span>
                </div>
                <div className="p-3 bg-surface-2 rounded border border-hairline">
                  <span className="text-muted-foreground block uppercase text-[10px] font-bold">IP Range</span>
                  <span className="font-semibold text-foreground">{customerObj?.network?.start_ip || customerObj?.start_ip || '—'} – {customerObj?.network?.end_ip || customerObj?.end_ip || '—'}</span>
                </div>
                <div className="p-3 bg-surface-2 rounded border border-hairline">
                  <span className="text-muted-foreground block uppercase text-[10px] font-bold">SVLAN / CVLAN</span>
                  <span className="font-semibold text-foreground">{customerObj?.network?.svlan || customerObj?.svlan || '—'} / {customerObj?.network?.cvlan || customerObj?.cvlan || 'None'}</span>
                </div>
                <div className="p-3 bg-surface-2 rounded border border-hairline">
                  <span className="text-muted-foreground block uppercase text-[10px] font-bold">Session / Idle Timeout</span>
                  <span className="font-semibold text-foreground">{customerObj?.session_defaults?.session_timeout || customerObj?.session_timeout || 0}s / {customerObj?.session_defaults?.idle_timeout || customerObj?.idle_timeout || 0}s</span>
                </div>
                <div className="p-3 bg-surface-2 rounded border border-hairline">
                  <span className="text-muted-foreground block uppercase text-[10px] font-bold">Total Users Limit</span>
                  <span className="font-semibold text-foreground">{customerObj?.total_users ?? '—'}</span>
                </div>
              </div>

              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Full Raw JSON Payload</span>
              <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[450px]">
                {JSON.stringify(config, null, 2)}
              </pre>
            </CardBody>
          </Card>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmSave}
        title="Apply Upstream Configuration to Router?"
        description="Are you sure you want to write these configuration changes directly to the VyOS router database? This may immediately impact active network routing and portal behavior for this customer."
        confirmText="Apply to Router"
        variant="danger"
        isLoading={updateConfig.isPending}
        onConfirm={handleConfirmSave}
        onClose={() => setConfirmSave(false)}
      />
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

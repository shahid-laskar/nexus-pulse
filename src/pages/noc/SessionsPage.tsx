import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { nocApi } from '@/api/noc'
import { customersApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useApiError } from '@/hooks/useApiError'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table'
import { useState } from 'react'
import { PageLoader } from '@/components/ui/Spinner'

function QoSActions({ customerId, ip }: { customerId: number, ip: string }) {
  const [profileId, setProfileId] = useState('')
  const { getError } = useApiError()

  const provision = useMutation({
    mutationFn: () => nocApi.provisionQoS(customerId, ip, Number(profileId)),
    onSuccess: () => toast.success('QoS provisioned'),
    onError: err => toast.error(getError(err))
  })

  const remove = useMutation({
    mutationFn: () => nocApi.removeQoS(customerId, ip, Number(profileId)),
    onSuccess: () => toast.success('QoS removed'),
    onError: err => toast.error(getError(err))
  })

  const getStats = useMutation({
    mutationFn: () => nocApi.getQoSStats(customerId, ip, Number(profileId)),
    onSuccess: (data) => {
       toast.success(`Stats: ${JSON.stringify(data.stats)}`, { duration: 8000 })
    },
    onError: err => toast.error(getError(err))
  })

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
      <span className="text-xs text-gray-500">QoS:</span>
      <input 
        type="number" 
        placeholder="Profile ID" 
        value={profileId} 
        onChange={e => setProfileId(e.target.value)} 
        className="form-input text-sm py-1 px-2 h-7 w-24"
      />
      <Button size="sm" disabled={!profileId} loading={provision.isPending} onClick={() => provision.mutate()}>Provision</Button>
      <Button size="sm" variant="danger" disabled={!profileId} loading={remove.isPending} onClick={() => remove.mutate()}>Remove</Button>
      <Button size="sm" variant="secondary" disabled={!profileId} loading={getStats.isPending} onClick={() => getStats.mutate()}>Stats</Button>
    </div>
  )
}

export function SessionsPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_NOC_ADMIN'])
  const { id }     = useParams<{ id: string }>()
  const { getError } = useApiError()
  const qc         = useQueryClient()
  const custId     = Number(id)

  const { data: customer } = useQuery({
    queryKey: ['customers', id],
    queryFn:  () => customersApi.get(custId),
  })

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['noc-sessions', id],
    queryFn:  () => nocApi.listSessions(custId),
    refetchInterval: 10_000, // auto-refresh every 10s
  })

  const flush = useMutation({
    mutationFn: () => nocApi.flushSessions(custId),
    onSuccess: () => {
      toast.success('All sessions flushed')
      qc.invalidateQueries({ queryKey: ['noc-sessions', id] })
    },
    onError: (err) => toast.error(getError(err)),
  })

  const disconnect = useMutation({
    mutationFn: (ip: string) => nocApi.disconnectSession(custId, ip),
    onSuccess: () => {
      toast.success('Session disconnected')
      qc.invalidateQueries({ queryKey: ['noc-sessions', id] })
    },
    onError: (err) => toast.error(getError(err)),
  })

  return (
    <div>
      <PageHeader
        title={`Sessions — ${customer?.company_name ?? '...'}`}
        subtitle={`${sessions?.session_count ?? 0} active sessions · auto-refresh 10s`}
        actions={
          <Button
            size="sm"
            variant="danger"
            loading={flush.isPending}
            onClick={() => { if (confirm('Flush ALL sessions? This disconnects every user.')) flush.mutate() }}
          >
            ⚠️ Flush All Sessions
          </Button>
        }
      />

      <div className="p-8">
        {isLoading ? <PageLoader /> : (
          <Table>
            <thead>
              <tr>
                <Th>IP Address</Th>
                <Th>Timeout Remaining</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {!sessions?.sessions.length
                ? <EmptyRow cols={3} message="No active sessions" />
                : sessions.sessions.map(s => (
                  <tr key={s.ip} className="hover:bg-[#fafbff]">
                    <Td><code className="text-sm">{s.ip}</code></Td>
                    <Td className="text-[#6b7ea8]">
                      {s.timeout_remaining != null ? `${s.timeout_remaining}s` : '—'}
                    </Td>
                    <Td>
                      <div>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={disconnect.isPending}
                          onClick={() => {
                            if (confirm(`Disconnect ${s.ip}?`)) disconnect.mutate(s.ip)
                          }}
                        >
                          Disconnect
                        </Button>
                        <QoSActions customerId={custId} ip={s.ip} />
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

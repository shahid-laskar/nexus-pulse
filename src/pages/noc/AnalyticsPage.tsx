import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Panel } from '@/components/pulse/primitives'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/axios'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Play, Square, RefreshCw, Terminal, Search, Clock, AlertTriangle, Info, ShieldAlert } from 'lucide-react'

interface LogEntry {
  timestamp: string
  message:   string
  level?:    'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'FATAL'
}

const COMMON_QUERIES = [
  { label: 'All captive-portal', query: '{job="captive-portal"}' },
  { label: 'Captive Portal Errors', query: '{job="captive-portal"} |= "ERROR"' },
  { label: 'BSNL Backend', query: '{job="bsnl-backend"}' },
  { label: 'NGINX Access', query: '{job="nginx"}' },
]

function guessLogLevel(msg: string): LogEntry['level'] {
  const upper = msg.toUpperCase()
  if (upper.includes('FATAL') || upper.includes('CRITICAL')) return 'FATAL'
  if (upper.includes('ERROR') || upper.includes('ERR')) return 'ERROR'
  if (upper.includes('WARN')) return 'WARN'
  if (upper.includes('DEBUG')) return 'DEBUG'
  return 'INFO'
}

const levelColors = {
  INFO:  'text-healthy bg-healthy-soft/30 border-healthy/20',
  WARN:  'text-warn bg-warn-soft/30 border-warn/20',
  ERROR: 'text-critical bg-critical-soft/30 border-critical/20',
  DEBUG: 'text-muted-foreground bg-surface-2 border-hairline',
  FATAL: 'text-white bg-critical border-critical',
}

export function AnalyticsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('{job="captive-portal"}')
  const [isLive, setIsLive] = useState(false)
  
  const bottomRef = useRef<HTMLDivElement>(null)
  
  const fetchLogs = async (q: string = query, isPoll: boolean = false) => {
    if (!isPoll) setLoading(true)
    try {
      const res = await api.get('/noc/logs/', { params: { query: q, limit: 150 } })
      
      if (res.data.status === 'error') {
        if (!isPoll) toast.error(`Loki error: ${res.data.message}`)
        return
      }
      
      const results = res.data?.data?.result || []
      const parsedLogs: LogEntry[] = []
      
      results.forEach((stream: any) => {
        stream.values.forEach((val: [string, string]) => {
          parsedLogs.push({
            timestamp: new Date(Number(val[0]) / 1000000).toISOString(),
            message: val[1],
            level: guessLogLevel(val[1])
          })
        })
      })
      
      parsedLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      setLogs(parsedLogs)
    } catch (err: any) {
      if (!isPoll) toast.error('Failed to fetch logs from server')
    } finally {
      if (!isPoll) setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(query)
  }, [])

  useEffect(() => {
    let interval: any
    if (isLive) {
      interval = setInterval(() => {
        fetchLogs(query, true)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [isLive, query])
  
  const handleQuerySelect = (q: string) => {
    setQuery(q)
    fetchLogs(q)
  }

  return (
    <div>
      <PageHeader
        title="Central Analytics & Logs"
        question="Real-time Docker container telemetry from edge nodes"
        actions={
          <Link to="/noc"><Button variant="secondary" size="sm">&larr; Back to Dashboard</Button></Link>
        }
      />

      <div className="p-6 max-w-[1600px] mx-auto space-y-4">
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          
          {/* Sidebar Tools */}
          <div className="xl:col-span-1 space-y-4">
            <Panel title="Queries" description="Quick LogQL filters">
              <div className="space-y-2">
                {COMMON_QUERIES.map(cq => (
                  <button
                    key={cq.label}
                    onClick={() => handleQuerySelect(cq.query)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-[12px] font-medium transition-colors border",
                      query === cq.query 
                        ? "bg-primary/10 border-primary/20 text-primary" 
                        : "bg-surface-2 border-transparent text-muted-foreground hover:bg-surface-2/80 hover:text-foreground"
                    )}
                  >
                    {cq.label}
                  </button>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-hairline">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Live Streaming</p>
                <Button 
                  onClick={() => setIsLive(!isLive)} 
                  variant={isLive ? 'danger' : 'primary'} 
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isLive ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  {isLive ? 'Stop Live Tail' : 'Start Live Tail'}
                </Button>
                {isLive && <p className="text-[10px] text-muted-foreground mt-2 text-center animate-pulse">Polling every 3s...</p>}
              </div>
            </Panel>

            <Panel title="Log Summary" description="Overview of current view">
               <div className="flex justify-between items-center py-2 border-b border-hairline">
                 <span className="text-muted-foreground text-[12px]">Lines returned</span>
                 <span className="font-mono text-foreground text-[12px]">{logs.length}</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-hairline">
                 <span className="text-muted-foreground text-[12px]">Errors</span>
                 <span className="font-mono text-critical text-[12px]">{logs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length}</span>
               </div>
               <div className="flex justify-between items-center py-2">
                 <span className="text-muted-foreground text-[12px]">Warnings</span>
                 <span className="font-mono text-warn text-[12px]">{logs.filter(l => l.level === 'WARN').length}</span>
               </div>
            </Panel>
          </div>

          {/* Main Log Viewer */}
          <div className="xl:col-span-3">
            <Panel title="Log Explorer" className="h-[calc(100vh-140px)] flex flex-col">
              
              {/* Query Bar */}
              <div className="flex gap-2 mb-4 shrink-0">
                <div className="flex-1 relative">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLogs(query)}
                    placeholder='Enter LogQL (e.g. {job="captive-portal"})'
                    className="pl-9 font-mono text-[12px] h-9"
                  />
                </div>
                <Button onClick={() => fetchLogs(query)} loading={loading && !isLive} className="h-9 gap-2 shrink-0">
                  <Search className="w-3.5 h-3.5" />
                  Query
                </Button>
              </div>

              {/* Log Output Area */}
              <div className="bg-[#0f1219] rounded-lg border border-hairline flex-1 overflow-auto p-1 font-mono text-[11.5px] leading-relaxed text-gray-300 relative shadow-inner">
                {loading && logs.length === 0 && !isLive ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mb-3" />
                    Querying Loki cluster...
                  </div>
                ) : logs.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No logs found for this query.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {/* Log Lines */}
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex hover:bg-white/[0.04] px-3 py-1.5 border-b border-white/[0.02] break-all group transition-colors">
                        <div className="shrink-0 w-[85px] text-gray-500 select-none flex flex-col gap-1 mt-0.5">
                          <span>{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
                        </div>
                        <div className="shrink-0 w-[55px] select-none mt-0.5">
                          <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border", levelColors[log.level || 'INFO'])}>
                            {log.level}
                          </span>
                        </div>
                        <div className="flex-1 ml-3 text-gray-300 group-hover:text-gray-100 transition-colors break-words whitespace-pre-wrap">
                          {log.message}
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
            </Panel>
          </div>

        </div>
      </div>
    </div>
  )
}

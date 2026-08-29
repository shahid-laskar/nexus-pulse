import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Sliders,
  Clock,
  ShieldCheck,
  Zap,
  Palette,
  AlertCircle,
  X,
  Send,
  RefreshCw,
} from 'lucide-react'
import { ebApi } from '@/api/eb'
import { extractErrorMessage } from '@/lib/axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  DEFAULT_BANDWIDTH_PROFILES,
  applyProfilePreset,
  type ProfilePresetType,
  kbpsToMbps,
  mbpsToKbps,
} from '@/lib/profileDefaults'
import type {
  CustomerRead,
  ChangeRequest,
  ChangeRequestType,
  ChangeRequestCreate,
  BandwidthProfileConfig,
} from '@/types'

interface EBChangeRequestModalProps {
  isOpen: boolean
  onClose: () => void
  customer: CustomerRead
  resubmitItem?: ChangeRequest | null
  onSuccess?: () => void
}

const CATEGORIES: {
  type: ChangeRequestType
  label: string
  icon: typeof Palette
  description: string
}[] = [
  {
    type: 'PORTAL_SETTINGS',
    label: 'Portal & Branding',
    icon: Palette,
    description: 'Customize colors, welcome message, terms, domain and entry flow.',
  },
  {
    type: 'SESSION_POLICY',
    label: 'Session & Quotas',
    icon: Clock,
    description: 'Adjust session duration, idle timeouts, user limits and data caps.',
  },
  {
    type: 'BANDWIDTH_PROFILE',
    label: 'Bandwidth Profiles',
    icon: Zap,
    description: 'Configure multi-tier download and upload speed limits.',
  },
  {
    type: 'AUTH_OPTIONS',
    label: 'Authentication',
    icon: ShieldCheck,
    description: 'Toggle login mechanisms, OTP verification, MAC binding and approval mode.',
  },
  {
    type: 'QOS',
    label: 'QoS & Interface',
    icon: Sliders,
    description: 'Update WAN interface peak bandwidth and traffic control policies.',
  },
]

export function EBChangeRequestModal({
  isOpen,
  onClose,
  customer,
  resubmitItem,
  onSuccess,
}: EBChangeRequestModalProps) {
  const qc = useQueryClient()

  // Selected Category Tab
  const [selectedType, setSelectedType] = useState<ChangeRequestType>(
    resubmitItem?.request_type || 'PORTAL_SETTINGS'
  )

  // Justification / EB Notes
  const [ebNotes, setEbNotes] = useState(resubmitItem?.eb_notes || '')

  // 1. PORTAL_SETTINGS state
  const [primaryColor, setPrimaryColor] = useState(customer.primary_color || '#004aad')
  const [secondaryColor, setSecondaryColor] = useState(customer.secondary_color || '#0066cc')
  const [welcomeMessage, setWelcomeMessage] = useState(customer.welcome_message || '')
  const [termsUrl, setTermsUrl] = useState(customer.terms_url || '')
  const [portalDomain, setPortalDomain] = useState(customer.portal_domain || '')
  const [portalEntryMode, setPortalEntryMode] = useState(customer.portal_entry_mode || 'login')

  // 2. SESSION_POLICY state
  const [sessionTimeout, setSessionTimeout] = useState(customer.session_timeout ?? 86400)
  const [idleTimeout, setIdleTimeout] = useState(customer.idle_timeout ?? 3600)
  const [maxConcurrentSessions, setMaxConcurrentSessions] = useState(
    customer.max_concurrent_sessions ?? 2
  )
  const [dailyDataLimitMb, setDailyDataLimitMb] = useState(customer.daily_data_limit_mb ?? 0)
  const [dataLimitMb, setDataLimitMb] = useState(customer.data_limit_mb ?? 0)
  const [totalUsers, setTotalUsers] = useState(customer.total_users ?? 100)
  const [otpValidityMinutes, setOtpValidityMinutes] = useState(
    customer.approval_otp_validity_minutes ?? 180
  )

  // 3. BANDWIDTH_PROFILE state
  const [bandwidthProfiles, setBandwidthProfiles] = useState<BandwidthProfileConfig[]>([
    ...DEFAULT_BANDWIDTH_PROFILES,
  ])

  // 4. AUTH_OPTIONS state
  const [enablePasswordLogin, setEnablePasswordLogin] = useState(
    customer.enable_password_login ?? true
  )
  const [enableOtpLogin, setEnableOtpLogin] = useState(customer.enable_otp_login ?? false)
  const [regApprovalMode, setRegApprovalMode] = useState(
    customer.registration_approval_mode || 'manual'
  )
  const [macBinding, setMacBinding] = useState(customer.mac_binding ?? false)
  const [enableMacWhitelist, setEnableMacWhitelist] = useState(
    customer.enable_mac_whitelist ?? false
  )

  // 5. QOS state
  const [maxBandwidth, setMaxBandwidth] = useState(customer.max_bandwidth || '1gbit')
  const [qosInterface, setQosInterface] = useState(customer.wan_interface || 'eth0')

  // Reset or populate fields when modal opens or resubmitItem changes
  useEffect(() => {
    if (resubmitItem) {
      setSelectedType(resubmitItem.request_type)
      setEbNotes(resubmitItem.eb_notes || '')
      const p = resubmitItem.payload || {}

      if (resubmitItem.request_type === 'PORTAL_SETTINGS') {
        if (p.primary_color) setPrimaryColor(p.primary_color)
        if (p.secondary_color) setSecondaryColor(p.secondary_color)
        if (p.welcome_message !== undefined) setWelcomeMessage(p.welcome_message)
        if (p.terms_url !== undefined) setTermsUrl(p.terms_url)
        if (p.portal_domain !== undefined) setPortalDomain(p.portal_domain)
        if (p.portal_entry_mode) setPortalEntryMode(p.portal_entry_mode)
      } else if (resubmitItem.request_type === 'SESSION_POLICY') {
        if (p.session_timeout !== undefined) setSessionTimeout(p.session_timeout)
        if (p.idle_timeout !== undefined) setIdleTimeout(p.idle_timeout)
        if (p.max_concurrent_sessions !== undefined)
          setMaxConcurrentSessions(p.max_concurrent_sessions)
        if (p.daily_data_limit_mb !== undefined) setDailyDataLimitMb(p.daily_data_limit_mb)
        if (p.data_limit_mb !== undefined) setDataLimitMb(p.data_limit_mb)
        if (p.total_users !== undefined) setTotalUsers(p.total_users)
        if (p.approval_otp_validity_minutes !== undefined)
          setOtpValidityMinutes(p.approval_otp_validity_minutes)
      } else if (resubmitItem.request_type === 'BANDWIDTH_PROFILE') {
        const pProfiles = p.profiles || {}
        const merged = DEFAULT_BANDWIDTH_PROFILES.map((def) => {
          const found = pProfiles[def.profile_name] || (customer.bandwidth_profiles || []).find((bp) => bp.profile_name === def.profile_name)
          return found ? { ...def, ...found } : def
        })
        setBandwidthProfiles(merged)
      } else if (resubmitItem.request_type === 'AUTH_OPTIONS') {
        if (p.enable_password_login !== undefined)
          setEnablePasswordLogin(p.enable_password_login)
        if (p.enable_otp_login !== undefined) setEnableOtpLogin(p.enable_otp_login)
        if (p.registration_approval_mode)
          setRegApprovalMode(p.registration_approval_mode)
        if (p.mac_binding !== undefined) setMacBinding(p.mac_binding)
        if (p.enable_mac_whitelist !== undefined)
          setEnableMacWhitelist(p.enable_mac_whitelist)
      } else if (resubmitItem.request_type === 'QOS') {
        if (p.max_bandwidth) setMaxBandwidth(p.max_bandwidth)
        if (p.interface) setQosInterface(p.interface)
      }
    } else {
      // Default to fresh customer values
      setSelectedType('PORTAL_SETTINGS')
      setEbNotes('')
      setPrimaryColor(customer.primary_color || '#004aad')
      setSecondaryColor(customer.secondary_color || '#0066cc')
      setWelcomeMessage(customer.welcome_message || '')
      setTermsUrl(customer.terms_url || '')
      setPortalDomain(customer.portal_domain || '')
      setPortalEntryMode(customer.portal_entry_mode || 'login')
      setSessionTimeout(customer.session_timeout ?? 86400)
      setIdleTimeout(customer.idle_timeout ?? 3600)
      setMaxConcurrentSessions(customer.max_concurrent_sessions ?? 2)
      setDailyDataLimitMb(customer.daily_data_limit_mb ?? 0)
      setDataLimitMb(customer.data_limit_mb ?? 0)
      setTotalUsers(customer.total_users ?? 100)
      setOtpValidityMinutes(customer.approval_otp_validity_minutes ?? 180)
      if (customer.bandwidth_profiles && customer.bandwidth_profiles.length > 0) {
        const existingMap = new Map(customer.bandwidth_profiles.map((p) => [p.profile_name, p]))
        const merged = DEFAULT_BANDWIDTH_PROFILES.map((def) => {
          const found = existingMap.get(def.profile_name)
          return found ? { ...def, ...found } : def
        })
        setBandwidthProfiles(merged)
      } else {
        setBandwidthProfiles([...DEFAULT_BANDWIDTH_PROFILES])
      }
      setEnablePasswordLogin(customer.enable_password_login ?? true)
      setEnableOtpLogin(customer.enable_otp_login ?? false)
      setRegApprovalMode(customer.registration_approval_mode || 'manual')
      setMacBinding(customer.mac_binding ?? false)
      setEnableMacWhitelist(customer.enable_mac_whitelist ?? false)
      setMaxBandwidth(customer.max_bandwidth || '1gbit')
      setQosInterface(customer.wan_interface || 'eth0')
    }
  }, [resubmitItem, customer, isOpen])

  const handleProfileFieldChange = (
    profileName: string,
    field: keyof BandwidthProfileConfig,
    value: any
  ) => {
    setBandwidthProfiles((prev) =>
      prev.map((p) => {
        if (p.profile_name === profileName) {
          return { ...p, [field]: value }
        }
        return p
      })
    )
  }

  const handleApplyPreset = (preset: ProfilePresetType) => {
    setBandwidthProfiles((prev) => applyProfilePreset(prev, preset))
  }

  const buildPayload = (): Record<string, any> => {
    switch (selectedType) {
      case 'PORTAL_SETTINGS':
        return {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          welcome_message: welcomeMessage,
          terms_url: termsUrl,
          portal_domain: portalDomain,
          portal_entry_mode: portalEntryMode,
        }
      case 'SESSION_POLICY':
        return {
          session_timeout: Number(sessionTimeout),
          idle_timeout: Number(idleTimeout),
          max_concurrent_sessions: Number(maxConcurrentSessions),
          daily_data_limit_mb: Number(dailyDataLimitMb),
          data_limit_mb: Number(dataLimitMb),
          total_users: Number(totalUsers),
          approval_otp_validity_minutes: Number(otpValidityMinutes),
        }
      case 'BANDWIDTH_PROFILE': {
        const profilesDict: Record<string, any> = {}
        for (const p of bandwidthProfiles) {
          profilesDict[p.profile_name] = {
            display_name: p.display_name,
            rate_bandwidth_up: Number(p.rate_bandwidth_up),
            ceil_bandwidth_up: Number(p.ceil_bandwidth_up),
            rate_bandwidth_down: Number(p.rate_bandwidth_down),
            ceil_bandwidth_down: Number(p.ceil_bandwidth_down),
            priority: Number(p.priority),
            is_active: Boolean(p.is_active),
            is_lan_only: Boolean(p.is_lan_only),
          }
        }
        return {
          profiles: profilesDict,
        }
      }
      case 'AUTH_OPTIONS':
        return {
          enable_password_login: Boolean(enablePasswordLogin),
          enable_otp_login: Boolean(enableOtpLogin),
          registration_approval_mode: regApprovalMode,
          mac_binding: Boolean(macBinding),
          enable_mac_whitelist: Boolean(enableMacWhitelist),
        }
      case 'QOS':
        return {
          max_bandwidth: maxBandwidth,
          interface: qosInterface,
        }
    }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload()
      const data: ChangeRequestCreate = {
        customer_id: customer.id,
        request_type: selectedType,
        payload,
        eb_notes: ebNotes.trim(),
      }

      if (resubmitItem) {
        return ebApi.resubmitChangeRequest(resubmitItem.id, data)
      } else {
        return ebApi.createChangeRequest(customer.id, data)
      }
    },
    onSuccess: (cr) => {
      toast.success(
        resubmitItem
          ? `Change request #${cr.id} resubmitted successfully`
          : `Change request #${cr.id} submitted for NOC review`
      )
      qc.invalidateQueries({ queryKey: ['eb-change-requests', customer.id] })
      qc.invalidateQueries({ queryKey: ['eb-all-change-requests'] })
      onSuccess?.()
      onClose()
    },
    onError: (err) => {
      toast.error(
        extractErrorMessage(
          err,
          resubmitItem
            ? 'Failed to resubmit change request'
            : 'Failed to submit change request'
        )
      )
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {resubmitItem
                  ? `Resubmit Change Request #${resubmitItem.id}`
                  : 'Request Configuration Change'}
              </h2>
              {resubmitItem && (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  NEEDS INFO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer: <span className="text-slate-800 font-semibold">{customer.company_name}</span> (ID: {customer.id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NOC Feedback Banner if Resubmitting */}
        {resubmitItem?.noc_notes && (
          <div className="bg-purple-50 border-b border-purple-100 px-6 py-3 flex items-start gap-3 text-purple-900">
            <AlertCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold">NOC Feedback & Clarification Needed:</span>
              <p className="mt-0.5 text-purple-800 whitespace-pre-wrap">{resubmitItem.noc_notes}</p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Category Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select Change Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = selectedType === cat.type
                return (
                  <button
                    key={cat.type}
                    type="button"
                    disabled={Boolean(resubmitItem)}
                    onClick={() => setSelectedType(cat.type)}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                    } ${resubmitItem && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-primary' : 'text-slate-500'}`} />
                    <span className="leading-tight">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Content Area */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5">
            {/* 1. PORTAL_SETTINGS */}
            {selectedType === 'PORTAL_SETTINGS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Portal Branding & Settings</h3>
                  <span className="text-xs text-slate-500">Live staging vs proposed changes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#004aad"
                        className="font-mono text-xs"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Current: {customer.primary_color}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">
                      Secondary Brand Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-10 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <Input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#0066cc"
                        className="font-mono text-xs"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Current: {customer.secondary_color}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">
                    Welcome Message
                  </label>
                  <textarea
                    rows={2}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="e.g. Welcome to High-Speed BSNL Enterprise WiFi"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-primary outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block truncate">
                    Current: {customer.welcome_message || '(empty)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Terms & Conditions URL"
                      type="url"
                      value={termsUrl}
                      onChange={(e) => setTermsUrl(e.target.value)}
                      placeholder="https://..."
                      hint={`Current: ${customer.terms_url || '(none)'}`}
                    />
                  </div>
                  <div>
                    <Input
                      label="Portal Custom Domain"
                      type="text"
                      value={portalDomain}
                      onChange={(e) => setPortalDomain(e.target.value)}
                      placeholder="wifi.customer.com"
                      hint={`Current: ${customer.portal_domain || '(none)'}`}
                    />
                  </div>
                </div>

                <div>
                  <Select
                    label="Portal Entry Flow Mode"
                    value={portalEntryMode}
                    onChange={(e) => setPortalEntryMode(e.target.value)}
                    options={[
                      { value: 'login', label: 'Login First (Requires existing credentials)' },
                      { value: 'register', label: 'Self-Registration First' },
                    ]}
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Current: {customer.portal_entry_mode || 'login'}
                  </span>
                </div>
              </div>
            )}

            {/* 2. SESSION_POLICY */}
            {selectedType === 'SESSION_POLICY' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Session Policy & Quota Limits</h3>
                  <span className="text-xs text-slate-500">Configure connection life-cycles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Session Timeout (Seconds)"
                    type="number"
                    min={60}
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(Number(e.target.value))}
                    hint={`Current: ${customer.session_timeout ?? 86400}s (${Math.round((customer.session_timeout ?? 86400) / 3600)}h)`}
                  />
                  <Input
                    label="Idle Timeout (Seconds)"
                    type="number"
                    min={60}
                    value={idleTimeout}
                    onChange={(e) => setIdleTimeout(Number(e.target.value))}
                    hint={`Current: ${customer.idle_timeout ?? 3600}s (${Math.round((customer.idle_timeout ?? 3600) / 60)}m)`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Max Concurrent Devices / User"
                    type="number"
                    min={1}
                    max={10}
                    value={maxConcurrentSessions}
                    onChange={(e) => setMaxConcurrentSessions(Number(e.target.value))}
                    hint={`Current: ${customer.max_concurrent_sessions ?? 2}`}
                  />
                  <Input
                    label="Total Allowed User Accounts"
                    type="number"
                    min={1}
                    value={totalUsers}
                    onChange={(e) => setTotalUsers(Number(e.target.value))}
                    hint={`Current: ${customer.total_users ?? 100}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Daily Data Cap (MB, 0 = Unlimited)"
                    type="number"
                    min={0}
                    value={dailyDataLimitMb}
                    onChange={(e) => setDailyDataLimitMb(Number(e.target.value))}
                    hint={`Current: ${customer.daily_data_limit_mb ?? 0} MB`}
                  />
                  <Input
                    label="Monthly Data Cap (MB, 0 = Unlimited)"
                    type="number"
                    min={0}
                    value={dataLimitMb}
                    onChange={(e) => setDataLimitMb(Number(e.target.value))}
                    hint={`Current: ${customer.data_limit_mb ?? 0} MB`}
                  />
                </div>

                <div>
                  <Input
                    label="Registration OTP Validity (Minutes)"
                    type="number"
                    min={5}
                    max={1440}
                    value={otpValidityMinutes}
                    onChange={(e) => setOtpValidityMinutes(Number(e.target.value))}
                    hint={`Current: ${customer.approval_otp_validity_minutes ?? 180} minutes`}
                  />
                </div>
              </div>
            )}

            {/* 3. BANDWIDTH_PROFILE */}
            {selectedType === 'BANDWIDTH_PROFILE' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">User Bandwidth Profiles & Speed Tiers</h3>
                    <span className="text-xs text-slate-500">Configure multi-tier download and upload rate limits</span>
                  </div>
                  {/* Preset Shortcuts */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('bronze_only')}
                      className="px-2 py-1 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      Bronze Only
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('bronze_gold')}
                      className="px-2 py-1 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      Bronze + Gold
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('all_four')}
                      className="px-2 py-1 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      All 4 Tiers
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {bandwidthProfiles.map((p) => {
                    const tierMeta: Record<string, { label: string; badge: string; color: string }> = {
                      bronze: { label: 'Bronze (Tier 1 - Default)', badge: '🥉 Bronze', color: 'border-amber-700/30 bg-amber-50/30' },
                      silver: { label: 'Silver (Tier 2)', badge: '🥈 Silver', color: 'border-slate-300 bg-slate-50/50' },
                      gold: { label: 'Gold (Tier 3 - VIP)', badge: '🥇 Gold', color: 'border-yellow-500/30 bg-yellow-50/30' },
                      platinum: { label: 'Platinum (Tier 4 - Executive)', badge: '💎 Platinum', color: 'border-cyan-500/30 bg-cyan-50/30' },
                    }
                    const meta = tierMeta[p.profile_name] || {
                      label: p.display_name,
                      badge: p.profile_name.toUpperCase(),
                      color: 'border-slate-200 bg-slate-50',
                    }

                    const liveP = (customer.bandwidth_profiles || []).find((bp) => bp.profile_name === p.profile_name)

                    return (
                      <div
                        key={p.profile_name}
                        className={`rounded-xl border p-4 transition-all ${
                          p.is_active ? 'border-slate-300 bg-white shadow-2xs' : 'border-slate-200 bg-slate-50/60 opacity-75'
                        }`}
                      >
                        {/* Tier Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                              {meta.badge}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{meta.label}</span>
                              <span className="text-[10.5px] text-slate-400">
                                Priority: {p.priority} • {p.display_name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* LAN-Only Toggle */}
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={p.is_lan_only}
                                onChange={(e) =>
                                  handleProfileFieldChange(p.profile_name, 'is_lan_only', e.target.checked)
                                }
                                className="w-3.5 h-3.5 text-primary rounded"
                              />
                              <span className="text-[11px] font-semibold text-slate-600">LAN-Only</span>
                            </label>

                            {/* Active Toggle */}
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={p.is_active}
                                onChange={(e) =>
                                  handleProfileFieldChange(p.profile_name, 'is_active', e.target.checked)
                                }
                                className="w-4 h-4 text-primary rounded"
                              />
                              <span className={`text-xs font-bold ${p.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {p.is_active ? 'Enabled' : 'Disabled'}
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Bandwidth Limits Grid (in Mbps) */}
                        {p.is_active && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                            <div>
                              <label className="text-[10.5px] font-bold text-slate-600 uppercase block mb-1">
                                Download Rate (Mbps)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={10000}
                                value={kbpsToMbps(p.rate_bandwidth_down)}
                                onChange={(e) =>
                                  handleProfileFieldChange(
                                    p.profile_name,
                                    'rate_bandwidth_down',
                                    mbpsToKbps(Number(e.target.value))
                                  )
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono focus:border-primary outline-none"
                              />
                              {liveP && (
                                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                                  Current: {kbpsToMbps(liveP.rate_bandwidth_down)} Mbps
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="text-[10.5px] font-bold text-slate-600 uppercase block mb-1">
                                Burst Download (Mbps)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={10000}
                                value={kbpsToMbps(p.ceil_bandwidth_down)}
                                onChange={(e) =>
                                  handleProfileFieldChange(
                                    p.profile_name,
                                    'ceil_bandwidth_down',
                                    mbpsToKbps(Number(e.target.value))
                                  )
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono focus:border-primary outline-none"
                              />
                              {liveP && (
                                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                                  Current: {kbpsToMbps(liveP.ceil_bandwidth_down)} Mbps
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="text-[10.5px] font-bold text-slate-600 uppercase block mb-1">
                                Upload Rate (Mbps)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={10000}
                                value={kbpsToMbps(p.rate_bandwidth_up)}
                                onChange={(e) =>
                                  handleProfileFieldChange(
                                    p.profile_name,
                                    'rate_bandwidth_up',
                                    mbpsToKbps(Number(e.target.value))
                                  )
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono focus:border-primary outline-none"
                              />
                              {liveP && (
                                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                                  Current: {kbpsToMbps(liveP.rate_bandwidth_up)} Mbps
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="text-[10.5px] font-bold text-slate-600 uppercase block mb-1">
                                Burst Upload (Mbps)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={10000}
                                value={kbpsToMbps(p.ceil_bandwidth_up)}
                                onChange={(e) =>
                                  handleProfileFieldChange(
                                    p.profile_name,
                                    'ceil_bandwidth_up',
                                    mbpsToKbps(Number(e.target.value))
                                  )
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono focus:border-primary outline-none"
                              />
                              {liveP && (
                                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                                  Current: {kbpsToMbps(liveP.ceil_bandwidth_up)} Mbps
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 4. AUTH_OPTIONS */}
            {selectedType === 'AUTH_OPTIONS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Authentication & Security Settings</h3>
                  <span className="text-xs text-slate-500">Access policies</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Password Authentication</span>
                      <span className="text-[11px] text-slate-500">Allow users to log in with username/password</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enablePasswordLogin}
                      onChange={(e) => setEnablePasswordLogin(e.target.checked)}
                      className="w-4 h-4 text-primary rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">OTP / SMS Authentication</span>
                      <span className="text-[11px] text-slate-500">Require one-time passcode on mobile</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableOtpLogin}
                      onChange={(e) => setEnableOtpLogin(e.target.checked)}
                      className="w-4 h-4 text-primary rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">MAC Device Binding</span>
                      <span className="text-[11px] text-slate-500">Lock user credentials to first connecting device</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={macBinding}
                      onChange={(e) => setMacBinding(e.target.checked)}
                      className="w-4 h-4 text-primary rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">MAC Whitelist Enforce</span>
                      <span className="text-[11px] text-slate-500">Permit access only to pre-registered MAC addresses</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableMacWhitelist}
                      onChange={(e) => setEnableMacWhitelist(e.target.checked)}
                      className="w-4 h-4 text-primary rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <Select
                    label="Self-Registration Approval Mode"
                    value={regApprovalMode}
                    onChange={(e) => setRegApprovalMode(e.target.value)}
                    options={[
                      { value: 'manual', label: 'Manual Approval (NOC / EB operator approves each registrant)' },
                      { value: 'auto', label: 'Automatic Approval (Immediate access post-OTP)' },
                    ]}
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Current: {customer.registration_approval_mode || 'manual'}
                  </span>
                </div>
              </div>
            )}

            {/* 5. QOS */}
            {selectedType === 'QOS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">QoS & Peak Bandwidth</h3>
                  <span className="text-xs text-slate-500">Router traffic shaping limits</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Max Committed Bandwidth"
                    type="text"
                    value={maxBandwidth}
                    onChange={(e) => setMaxBandwidth(e.target.value)}
                    placeholder="e.g. 1gbit, 500mbit, 100mbit"
                    hint={`Current: ${customer.max_bandwidth || '1gbit'}`}
                  />
                  <Input
                    label="Target Interface"
                    type="text"
                    value={qosInterface}
                    onChange={(e) => setQosInterface(e.target.value)}
                    placeholder="e.g. eth0"
                    hint={`Current WAN Interface: ${customer.wan_interface || 'eth0'}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* EB Notes / Justification Section */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Rationale & Operational Justification for NOC *
            </label>
            <textarea
              rows={3}
              value={ebNotes}
              onChange={(e) => setEbNotes(e.target.value)}
              placeholder="Explain the commercial reason or customer request triggering this change..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-primary outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              This note will be visible to NOC engineers during review and auditing.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <Button variant="secondary" onClick={onClose} disabled={submitMutation.isPending}>
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="flex items-center gap-2"
          >
            {submitMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : resubmitItem ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitMutation.isPending
              ? 'Submitting...'
              : resubmitItem
              ? 'Resubmit Change Request'
              : 'Submit Change Request'}
          </Button>
        </div>
      </div>
    </div>
  )
}

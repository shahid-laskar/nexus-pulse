import React, { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
  Building2,
  Network,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { nocApi } from '@/api/noc'
import { circlesApi, businessAreasApi } from '@/api/master-data'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { UnintegratedCustomer, AdoptCustomerPayload } from '@/types'

interface AdoptCustomerModalProps {
  instanceId: number | null
  initialCustomer?: UnintegratedCustomer | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AdoptCustomerModal({
  instanceId,
  initialCustomer,
  isOpen,
  onClose,
  onSuccess,
}: AdoptCustomerModalProps) {
  const queryClient = useQueryClient()

  // 1. Fetch unintegrated customers if initialCustomer not provided directly
  const {
    data: unintegratedList = [],
    isLoading: isLoadingList,
  } = useQuery({
    queryKey: ['unintegrated-customers', instanceId],
    queryFn: () => nocApi.getUnintegratedCustomers(instanceId!),
    enabled: Boolean(isOpen && instanceId && !initialCustomer),
  })

  // 2. Fetch Circles and Business Areas
  const { data: circles = [] } = useQuery({
    queryKey: ['circles'],
    queryFn: () => circlesApi.list(),
    enabled: isOpen,
  })

  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [selectedCircleId, setSelectedCircleId] = useState<number | ''>('')
  const [selectedBaId, setSelectedBaId] = useState<number | ''>('')

  // Form fields
  const [companyName, setCompanyName] = useState('')
  const [gstin, setGstin] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [subnetCidr, setSubnetCidr] = useState('')
  const [gatewayIp, setGatewayIp] = useState('')
  const [maxBandwidth, setMaxBandwidth] = useState('50mbit')

  const { data: allBusinessAreas = [] } = useQuery({
    queryKey: ['business-areas'],
    queryFn: () => businessAreasApi.list(),
    enabled: isOpen,
  })

  const businessAreas = selectedCircleId
    ? allBusinessAreas.filter((b) => b.circle_id === Number(selectedCircleId))
    : allBusinessAreas

  const currentCustomer: UnintegratedCustomer | undefined =
    initialCustomer ||
    unintegratedList.find((c) => c.slug === selectedSlug) ||
    unintegratedList[0]

  useEffect(() => {
    if (initialCustomer) {
      setSelectedSlug(initialCustomer.slug)
    } else if (unintegratedList.length > 0 && !selectedSlug) {
      setSelectedSlug(unintegratedList[0].slug)
    }
  }, [initialCustomer, unintegratedList])

  useEffect(() => {
    if (currentCustomer) {
      setCompanyName(currentCustomer.name || currentCustomer.slug)
      setContactPerson(currentCustomer.contact_person || 'Administrator')
      setContactEmail(currentCustomer.contact_email || `${currentCustomer.slug}@bsnl.in`)
      setContactPhone(currentCustomer.contact_phone || '9447000000')
      setSubnetCidr(currentCustomer.suggested_subnet_cidr || '')
      setGatewayIp(currentCustomer.suggested_gateway_ip || '')

      if (currentCustomer.suggested_circle_id) {
        setSelectedCircleId(currentCustomer.suggested_circle_id)
      } else if (circles.length > 0) {
        const kl = circles.find((c: any) => c.code === 'KL') || circles[0]
        setSelectedCircleId(kl.id)
      }

      if (currentCustomer.suggested_ba_id) {
        setSelectedBaId(currentCustomer.suggested_ba_id)
      }
    }
  }, [currentCustomer, circles])

  useEffect(() => {
    if (businessAreas.length > 0 && !selectedBaId) {
      const tvm = businessAreas.find((b: any) => b.code === 'TVM') || businessAreas[0]
      setSelectedBaId(tvm.id)
    }
  }, [businessAreas, selectedBaId])

  const adoptMutation = useMutation({
    mutationFn: (payload: AdoptCustomerPayload) => nocApi.adoptCustomer(payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Customer successfully integrated into Central Portal!')
      queryClient.invalidateQueries({ queryKey: ['instance-topology', instanceId] })
      queryClient.invalidateQueries({ queryKey: ['unintegrated-customers', instanceId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to adopt customer'
      toast.error(msg)
    },
  })

  if (!isOpen || !instanceId) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCustomer) {
      toast.error('Please select a customer to adopt')
      return
    }
    if (!selectedCircleId || !selectedBaId) {
      toast.error('Please select both Circle and Business Area')
      return
    }

    const payload: AdoptCustomerPayload = {
      instance_id: instanceId,
      slug: currentCustomer.slug,
      circle_id: Number(selectedCircleId),
      business_area_id: Number(selectedBaId),
      company_name: companyName,
      gstin: gstin || undefined,
      contact_person: contactPerson,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      subnet_cidr: subnetCidr || undefined,
      gateway_ip: gatewayIp || undefined,
      dhcp_range_start: currentCustomer.start_ip || undefined,
      dhcp_range_end: currentCustomer.end_ip || undefined,
      max_bandwidth: maxBandwidth,
      qinq_interface: currentCustomer.qinq_interface,
      wan_interface: currentCustomer.wan_interface,
      svlan: currentCustomer.svlan,
      cvlan: currentCustomer.cvlan || undefined,
      customer_type: currentCustomer.customer_type,
    }

    adoptMutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Adopt & Integrate Customer Tenant
              </h3>
              <p className="text-xs text-slate-500">
                Router Instance #{instanceId} • Seamless Central Portal Linking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-200/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {isLoadingList ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Spinner className="h-6 w-6" />
              <p className="text-xs text-slate-500 font-medium">Scanning router for unintegrated tenants...</p>
            </div>
          ) : !currentCustomer ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">All Tenants Synchronized!</p>
              <p className="text-xs text-slate-500 mt-1">
                No unintegrated legacy customers found on Router #{instanceId}.
              </p>
            </div>
          ) : (
            <form id="adopt-customer-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Customer Selector if multiple */}
              {!initialCustomer && unintegratedList.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Unintegrated Tenant ({unintegratedList.length} available)
                  </label>
                  <select
                    className="w-full text-xs font-medium rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                  >
                    {unintegratedList.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name} ({c.slug}) — CVLAN {c.cvlan || 'None'} • {c.start_ip || 'No IP'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Detected Network Card */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5 text-blue-700" />
                    Detected Router Configuration (Immutable)
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-100/80 text-blue-800 font-bold">
                    Slug: {currentCustomer.slug}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11.5px] pt-1">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Interface:</span>
                    <strong className="text-slate-800">{currentCustomer.qinq_interface}.{currentCustomer.svlan}.{currentCustomer.cvlan || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">SVLAN / CVLAN:</span>
                    <strong className="text-slate-800">{currentCustomer.svlan} / {currentCustomer.cvlan ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">DHCP Range:</span>
                    <strong className="text-slate-800">{currentCustomer.start_ip || '—'} – {currentCustomer.end_ip || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Organization & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Circle <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    value={selectedCircleId}
                    onChange={(e) => {
                      setSelectedCircleId(Number(e.target.value))
                      setSelectedBaId('')
                    }}
                    required
                  >
                    <option value="">Select Circle</option>
                    {circles.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Area <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    value={selectedBaId}
                    onChange={(e) => setSelectedBaId(Number(e.target.value))}
                    required
                    disabled={!selectedCircleId}
                  >
                    <option value="">Select Business Area</option>
                    {businessAreas.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Company & Billing details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    placeholder="e.g. SBI Manacaud Branch"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTIN (Optional)
                  </label>
                  <Input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="32AAACS1429B1ZB"
                  />
                </div>
              </div>

              {/* Network Parameters */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subnet CIDR <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={subnetCidr}
                    onChange={(e) => setSubnetCidr(e.target.value)}
                    required
                    placeholder="10.5.107.0/24"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gateway IP <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={gatewayIp}
                    onChange={(e) => setGatewayIp(e.target.value)}
                    required
                    placeholder="10.5.107.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Bandwidth
                  </label>
                  <Input
                    value={maxBandwidth}
                    onChange={(e) => setMaxBandwidth(e.target.value)}
                    placeholder="50mbit"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Manager"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="admin@bsnl.in"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="9447000000"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Adopting reserves the subnet in IP Pools and links active sessions without downtime.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={adoptMutation.isPending}>
              Cancel
            </Button>
            {currentCustomer && (
              <Button
                type="submit"
                form="adopt-customer-form"
                variant="primary"
                size="sm"
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={adoptMutation.isPending}
              >
                {adoptMutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : <ShieldCheck className="h-4 w-4" />}
                Adopt & Integrate Customer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Building2,
  Sliders,
  Palette,
  MapPin,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
  Sparkles,
  Info,
  Wifi,
  RotateCcw,
  BookOpen,
  Gauge,
  Zap,
  Network,
  ShieldAlert,
} from 'lucide-react'

import { ebApi } from '@/api/eb'
import { circlesApi, businessAreasApi } from '@/api/master-data'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/store/auth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { DEFAULT_LEGAL_TEMPLATES, type LegalDocTemplate } from '@/lib/legalDefaults'
import {
  DEFAULT_BANDWIDTH_PROFILES,
  applyProfilePreset,
  kbpsToMbps,
  mbpsToKbps,
  type ProfilePresetType,
} from '@/lib/profileDefaults'
import type { CustomerCreate, CustomerUpdate, BandwidthProfileConfig } from '@/types'

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

const formSchema = z
  .object({
    // Section 1: Corporate Identity
    company_name: z.string().min(2, 'Company name must be at least 2 characters').max(200),
    user_account: z.string().min(1, 'User account is required').max(100),
    gstin: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format (e.g. 32AABCU9603R1ZX)'),
    cin: z.string().min(1, 'CIN is required').max(21, 'CIN must be at most 21 characters'),
    circle_id: z.coerce.number().optional().nullable(),
    business_area_id: z.coerce.number().optional().nullable(),
    location: z.string().max(200).optional(),
    contact_person: z.string().min(2, 'Contact person is required').max(200),
    contact_email: z.string().email('Invalid contact email address'),
    contact_phone: z.string().regex(/^\d{10}$/, 'Must be a 10-digit mobile number'),
    customer_type: z.enum(['general', 'register_first']).default('general'),

    // Section 2: Portal Settings & Capacity Planning
    registration_approval_mode: z.enum(['auto', 'manual']).default('auto'),
    enable_password_login: z.boolean().optional(),
    enable_otp_login: z.boolean().optional(),
    enable_volume_control: z.boolean().optional(),
    enable_mac_whitelist: z.boolean().optional(),
    max_bandwidth: z.string().default('1gbit'),
    session_timeout: z.coerce.number().min(300, 'Minimum 300 seconds (5 mins)').optional(),
    idle_timeout: z.coerce.number().min(60, 'Minimum 60 seconds (1 min)').optional(),
    max_concurrent_sessions: z.coerce.number().min(1).max(10).optional(),
    daily_data_limit_mb: z.coerce.number().min(0).optional(),
    data_limit_mb: z.coerce.number().min(0).optional(),
    approval_otp_validity_minutes: z.coerce.number().min(1).optional(),

    // Capacity & IP pool sizing (adjustable by EB Admin)
    total_users: z.coerce.number().min(1, 'Total users must be at least 1').default(100),
    concurrent_users: z.coerce.number().min(0, 'Must be positive').default(0),
    guard_buffer_pct: z.coerce.number().min(0).max(100).default(25),
    dhcp_lease_time: z.coerce.number().min(60, 'Minimum 60 seconds').default(900),

    // Section 3: Branding & Media
    welcome_message: z.string().optional(),
    terms_url: z.string().optional(),
    primary_color: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color (e.g. #004aad)').optional(),
    secondary_color: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color (e.g. #0066cc)').optional(),

    // Section 4: Contact & Addresses
    billing_address_line1: z.string().min(5, 'Billing address is required (at least 5 chars)'),
    billing_address_line2: z.string().optional(),
    billing_city: z.string().min(2, 'Billing city is required'),
    billing_state: z.string().min(2, 'Billing state is required'),
    billing_pincode: z.string().regex(/^\d{6}$/, 'Must be a 6-digit pincode'),
    same_as_billing: z.boolean().optional(),
    installation_address_line1: z.string().optional(),
    installation_address_line2: z.string().optional(),
    installation_city: z.string().optional(),
    installation_state: z.string().optional(),
    installation_pincode: z.string().optional(),

    // Branch & Manager Details (only for register_first)
    branch_name: z.string().optional(),
    branch_code: z.string().optional(),
    manager_name: z.string().optional(),
    manager_phone: z.string().optional(),
    manager_email: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Installation address required if not same as billing
    if (data.same_as_billing === false) {
      if (!data.installation_address_line1 || data.installation_address_line1.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Installation address line 1 is required when different from billing',
          path: ['installation_address_line1'],
        })
      }
      if (!data.installation_city || data.installation_city.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Installation city is required',
          path: ['installation_city'],
        })
      }
      if (!data.installation_state || data.installation_state.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Installation state is required',
          path: ['installation_state'],
        })
      }
      if (!data.installation_pincode || !/^\d{6}$/.test(data.installation_pincode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Installation pincode must be 6 digits',
          path: ['installation_pincode'],
        })
      }
    }

    // Branch & Manager details are strictly required when customer_type is register_first
    if (data.customer_type === 'register_first') {
      if (!data.branch_name || data.branch_name.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Branch name is required for Register First customers',
          path: ['branch_name'],
        })
      }
      if (!data.manager_name || data.manager_name.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Manager name is required for Register First customers',
          path: ['manager_name'],
        })
      }
      if (!data.manager_phone || !/^\d{10}$/.test(data.manager_phone.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '10-digit manager phone number is required for Register First customers',
          path: ['manager_phone'],
        })
      }
    }
  })

type FormValues = z.infer<typeof formSchema>

export function EBCustomerFormPage() {
  useRequireAuth(['SUPER_ADMIN', 'BA_ADMIN', 'BA_EB_ADMIN'])
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const customerId = id ? parseInt(id, 10) : undefined

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isSuper = user?.profile?.role?.name === 'SUPER_ADMIN'

  // Section collapse states (4 sections)
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
  })

  const toggleSection = (section: number) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Media files state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  // Legal Compliance Documents State (ToS, Privacy Policy, Fair Usage Policy)
  const [activeLegalTab, setActiveLegalTab] = useState<'tos' | 'privacy' | 'fup'>('tos')
  const [legalDocs, setLegalDocs] = useState<Record<'tos' | 'privacy' | 'fup', LegalDocTemplate>>({
    tos: { ...DEFAULT_LEGAL_TEMPLATES.tos },
    privacy: { ...DEFAULT_LEGAL_TEMPLATES.privacy },
    fup: { ...DEFAULT_LEGAL_TEMPLATES.fup },
  })

  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Fetch Circles and Business Areas
  const { data: circles = [] } = useQuery({
    queryKey: ['circles'],
    queryFn: circlesApi.list,
  })

  const { data: businessAreas = [] } = useQuery({
    queryKey: ['business-areas'],
    queryFn: businessAreasApi.list,
  })

  // Fetch Existing Customer if in Edit Mode
  const { data: existingCustomer, isLoading: isFetchingCustomer } = useQuery({
    queryKey: ['eb-customer', customerId],
    queryFn: () => ebApi.get(customerId!),
    enabled: isEdit && Boolean(customerId),
  })

  // Fetch Existing Legal Docs if in Edit Mode
  const { data: fetchedLegalDocs } = useQuery({
    queryKey: ['eb-legal-docs', customerId],
    queryFn: async () => {
      if (!customerId) return null
      try {
        const res = await ebApi.listLegalDocs(customerId)
        return res.legal_documents || []
      } catch {
        return []
      }
    },
    enabled: isEdit && Boolean(customerId),
  })

  // Bandwidth Profiles State (Bronze, Silver, Gold, Platinum & LAN-Only)
  const [bandwidthProfiles, setBandwidthProfiles] = useState<BandwidthProfileConfig[]>([
    ...DEFAULT_BANDWIDTH_PROFILES,
  ])

  // Hydrate legal docs if loaded from existing customer
  useEffect(() => {
    if (fetchedLegalDocs && fetchedLegalDocs.length > 0) {
      setLegalDocs((prev) => {
        const next = { ...prev }
        for (const doc of fetchedLegalDocs) {
          if (doc.doc_type === 'tos' || doc.doc_type === 'privacy' || doc.doc_type === 'fup') {
            next[doc.doc_type] = {
              doc_type: doc.doc_type,
              title: doc.title || prev[doc.doc_type].title,
              body_html: doc.body_html || prev[doc.doc_type].body_html,
              effective_date: doc.effective_date || prev[doc.doc_type].effective_date,
              requires_reacceptance: doc.requires_reacceptance ?? false,
            }
          }
        }
        return next
      })
    }
  }, [fetchedLegalDocs])

  // Hydrate bandwidth profiles if loaded from existing customer
  useEffect(() => {
    if (existingCustomer?.bandwidth_profiles && existingCustomer.bandwidth_profiles.length > 0) {
      const existingMap = new Map(existingCustomer.bandwidth_profiles.map((p) => [p.profile_name, p]))
      const merged = DEFAULT_BANDWIDTH_PROFILES.map((def) => {
        const found = existingMap.get(def.profile_name)
        return found ? { ...def, ...found } : def
      })
      setBandwidthProfiles(merged)
    }
  }, [existingCustomer])

  const handleProfileFieldChange = (
    profileName: 'bronze' | 'silver' | 'gold' | 'platinum',
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

  const handleResetProfileTier = (profileName: 'bronze' | 'silver' | 'gold' | 'platinum') => {
    const defaultTier = DEFAULT_BANDWIDTH_PROFILES.find((d) => d.profile_name === profileName)
    if (defaultTier) {
      setBandwidthProfiles((prev) =>
        prev.map((p) => (p.profile_name === profileName ? { ...defaultTier } : p))
      )
      toast.success(`Reset ${profileName} profile to default settings`)
    }
  }

  const handleApplyPreset = (preset: ProfilePresetType) => {
    setBandwidthProfiles((prev) => applyProfilePreset(prev, preset))
    const labels: Record<ProfilePresetType, string> = {
      bronze_only: 'Bronze Only (Single Tier)',
      bronze_gold: 'Bronze & Gold (Standard + VIP)',
      bronze_silver_gold: 'Bronze, Silver & Gold',
      all_four: 'All 4 Tiers (Bronze, Silver, Gold, Platinum)',
    }
    toast.success(`Applied preset: ${labels[preset]}`)
  }

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      company_name: '',
      user_account: '',
      gstin: '',
      cin: '',
      circle_id: user?.profile?.circle?.id || undefined,
      business_area_id: user?.profile?.business_area?.id || undefined,
      location: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      customer_type: 'general',
      registration_approval_mode: 'auto',
      enable_password_login: true,
      enable_otp_login: false,
      enable_volume_control: true,
      enable_mac_whitelist: false,
      max_bandwidth: '1gbit',
      session_timeout: 86400,
      idle_timeout: 3600,
      max_concurrent_sessions: 2,
      total_users: 100,
      concurrent_users: 0,
      guard_buffer_pct: 25,
      dhcp_lease_time: 900,
      daily_data_limit_mb: 0,
      data_limit_mb: 0,
      approval_otp_validity_minutes: 180,
      welcome_message: '',
      terms_url: '',
      primary_color: '#004aad',
      secondary_color: '#0066cc',
      billing_address_line1: '',
      billing_address_line2: '',
      billing_city: '',
      billing_state: '',
      billing_pincode: '',
      same_as_billing: true,
      installation_address_line1: '',
      installation_address_line2: '',
      installation_city: '',
      installation_state: '',
      installation_pincode: '',
      branch_name: '',
      branch_code: '',
      manager_name: '',
      manager_phone: '',
      manager_email: '',
    },
  })

  const watchedTotalUsers = useWatch({ control, name: 'total_users' }) || 100
  const watchedConcurrentUsers = useWatch({ control, name: 'concurrent_users' }) || 0
  const watchedBufferPct = useWatch({ control, name: 'guard_buffer_pct' }) ?? 25
  const watchedCustomerType = useWatch({ control, name: 'customer_type' }) || 'general'
  const watchedCircleId = useWatch({ control, name: 'circle_id' })
  const watchedBAId = useWatch({ control, name: 'business_area_id' })
  const watchedSameAsBilling = useWatch({ control, name: 'same_as_billing' })
  const watchedVolumeControl = useWatch({ control, name: 'enable_volume_control' })

  // Handle Customer Type Change side effects:
  // - General: enable_volume_control = true, login options visible
  // - Register First: enable_volume_control = false, login options unchecked & hidden
  const handleCustomerTypeChange = (newType: 'general' | 'register_first') => {
    setValue('customer_type', newType)
    if (newType === 'register_first') {
      setValue('enable_volume_control', false)
      setValue('enable_password_login', false)
      setValue('enable_otp_login', false)
    } else {
      setValue('enable_volume_control', true)
      setValue('enable_password_login', true)
      setValue('enable_otp_login', false)
    }
  }

  // Capacity estimate calculations based on research
  const capacityEstimate = useMemo(() => {
    const total = Math.max(1, Number(watchedTotalUsers) || 1)
    const target = Number(watchedConcurrentUsers) > 0 ? Number(watchedConcurrentUsers) : total
    const bufferPct = Math.max(0, Number(watchedBufferPct) || 0)
    const buffer = Math.ceil(target * (bufferPct / 100))
    const required = target + buffer + 3
    const BUCKETS = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096]
    let totalIps = 4096
    for (const b of BUCKETS) {
      if (b >= required) {
        totalIps = b
        break
      }
    }
    const prefix = 32 - Math.round(Math.log2(totalIps))
    const usable = Math.max(0, totalIps - 2)
    const clientAssignable = prefix <= 27 ? Math.max(0, totalIps - 5) : Math.max(0, totalIps - 2)
    const efficiency = Math.min(100, Math.round((required / totalIps) * 1000) / 10)
    const concurrencyRatio = Math.round((target / total) * 100)
    return {
      total,
      target,
      buffer,
      bufferPct,
      required,
      totalIps,
      prefix,
      usable,
      clientAssignable,
      efficiency,
      concurrencyRatio,
    }
  }, [watchedTotalUsers, watchedConcurrentUsers, watchedBufferPct])

  // Filter Business Areas based on selected Circle (for Super Admin)
  const filteredBAs = useMemo(() => {
    if (!watchedCircleId) return []
    return businessAreas.filter((ba) => ba.circle_id === Number(watchedCircleId))
  }, [businessAreas, watchedCircleId])

  // Populate form if existingCustomer is loaded
  useEffect(() => {
    if (existingCustomer) {
      reset({
        company_name: existingCustomer.company_name,
        user_account: existingCustomer.user_account || '',
        gstin: existingCustomer.gstin,
        cin: existingCustomer.cin || '',
        circle_id: existingCustomer.circle_id,
        business_area_id: existingCustomer.business_area_id,
        location: existingCustomer.location || '',
        contact_person: existingCustomer.contact_person,
        contact_email: existingCustomer.contact_email,
        contact_phone: existingCustomer.contact_phone,
        customer_type: (existingCustomer.customer_type as 'general' | 'register_first') || 'general',
        registration_approval_mode: (existingCustomer.registration_approval_mode as 'auto' | 'manual') || 'auto',
        max_bandwidth: existingCustomer.max_bandwidth || '1gbit',
        enable_volume_control: existingCustomer.enable_volume_control ?? (existingCustomer.customer_type !== 'register_first'),
        enable_password_login: existingCustomer.customer_type === 'register_first' ? false : (existingCustomer.enable_password_login ?? true),
        enable_otp_login: existingCustomer.customer_type === 'register_first' ? false : (existingCustomer.enable_otp_login ?? false),
        session_timeout: existingCustomer.session_timeout || 86400,
        idle_timeout: existingCustomer.idle_timeout || 3600,
        max_concurrent_sessions: existingCustomer.max_concurrent_sessions || 2,
        total_users: existingCustomer.total_users || 100,
        concurrent_users: existingCustomer.concurrent_users || 0,
        guard_buffer_pct: 25,
        dhcp_lease_time: existingCustomer.dhcp_lease_time || 900,
        enable_mac_whitelist: existingCustomer.enable_mac_whitelist || false,
        daily_data_limit_mb: existingCustomer.daily_data_limit_mb || 0,
        data_limit_mb: existingCustomer.data_limit_mb || 0,
        approval_otp_validity_minutes: existingCustomer.approval_otp_validity_minutes || 180,
        welcome_message: existingCustomer.welcome_message || '',
        terms_url: existingCustomer.terms_url || '',
        primary_color: existingCustomer.primary_color || '#004aad',
        secondary_color: existingCustomer.secondary_color || '#0066cc',
        billing_address_line1: existingCustomer.billing_address_line1 || '',
        billing_address_line2: existingCustomer.billing_address_line2 || '',
        billing_city: existingCustomer.billing_city || '',
        billing_state: existingCustomer.billing_state || '',
        billing_pincode: existingCustomer.billing_pincode || '',
        same_as_billing: existingCustomer.same_as_billing ?? true,
        installation_address_line1: existingCustomer.installation_address_line1 || '',
        installation_address_line2: existingCustomer.installation_address_line2 || '',
        installation_city: existingCustomer.installation_city || '',
        installation_state: existingCustomer.installation_state || '',
        installation_pincode: existingCustomer.installation_pincode || '',
        branch_name: existingCustomer.branch_name || '',
        branch_code: existingCustomer.branch_code || '',
        manager_name: existingCustomer.manager_name || '',
        manager_phone: existingCustomer.manager_phone || '',
        manager_email: existingCustomer.manager_email || '',
      })
    }
  }, [existingCustomer, reset])

  // Handle Logo Upload Preview
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid image type. Allowed: PNG, JPEG, SVG')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo image exceeds 5MB size limit')
      return
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Handle Banner Upload Preview
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = ['image/png', 'image/jpeg']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid image type. Allowed: PNG, JPEG')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Banner image exceeds 5MB size limit')
      return
    }
    setBannerFile(file)
    const reader = new FileReader()
    reader.onload = () => setBannerPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Reset current legal tab to canonical template
  const handleResetLegalDoc = (type: 'tos' | 'privacy' | 'fup') => {
    setLegalDocs((prev) => ({
      ...prev,
      [type]: { ...DEFAULT_LEGAL_TEMPLATES[type] },
    }))
    toast.success(`Reset ${DEFAULT_LEGAL_TEMPLATES[type].title} to standard template`)
  }

  // Mutation for saving customer, assets, and legal documents
  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      let savedId = customerId
      const isRegisterFirst = data.customer_type === 'register_first'

      if (isEdit && customerId) {
        setUploadStatus('Updating customer records...')
        const updatePayload: CustomerUpdate = {
          company_name: data.company_name,
          customer_type: data.customer_type,
          user_account: data.user_account,
          cin: data.cin || null,
          location: data.location,
          circle_id: data.circle_id || undefined,
          business_area_id: data.business_area_id || undefined,
          contact_person: data.contact_person,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          billing_address_line1: data.billing_address_line1,
          billing_address_line2: data.billing_address_line2,
          billing_city: data.billing_city,
          billing_state: data.billing_state,
          billing_pincode: data.billing_pincode,
          same_as_billing: data.same_as_billing,
          installation_address_line1: data.installation_address_line1,
          installation_address_line2: data.installation_address_line2,
          installation_city: data.installation_city,
          installation_state: data.installation_state,
          installation_pincode: data.installation_pincode,
          registration_approval_mode: data.registration_approval_mode || 'auto',
          max_bandwidth: data.max_bandwidth || '1gbit',
          enable_volume_control: data.enable_volume_control ?? !isRegisterFirst,
          enable_password_login: isRegisterFirst ? false : (data.enable_password_login ?? true),
          enable_otp_login: isRegisterFirst ? false : (data.enable_otp_login ?? false),
          mac_binding: true, // Enforced true for all customers
          session_timeout: data.session_timeout,
          idle_timeout: data.idle_timeout,
          max_concurrent_sessions: data.max_concurrent_sessions,
          total_users: data.total_users,
          concurrent_users: data.concurrent_users,
          dhcp_lease_time: data.dhcp_lease_time,
          enable_mac_whitelist: data.enable_mac_whitelist,
          daily_data_limit_mb: data.daily_data_limit_mb,
          data_limit_mb: data.data_limit_mb,
          approval_otp_validity_minutes: data.approval_otp_validity_minutes,
          welcome_message: data.welcome_message,
          terms_url: data.terms_url,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          branch_name: isRegisterFirst ? data.branch_name : undefined,
          branch_code: isRegisterFirst ? data.branch_code : undefined,
          manager_name: isRegisterFirst ? data.manager_name : undefined,
          manager_phone: isRegisterFirst ? data.manager_phone : undefined,
          manager_email: isRegisterFirst ? data.manager_email : undefined,
          bandwidth_profiles: bandwidthProfiles,
        }
        await ebApi.update(customerId, updatePayload)
      } else {
        setUploadStatus('Creating customer record...')
        const createPayload: CustomerCreate = {
          company_name: data.company_name,
          customer_type: data.customer_type,
          gstin: data.gstin,
          cin: data.cin,
          user_account: data.user_account,
          location: data.location,
          circle_id: data.circle_id || undefined,
          business_area_id: data.business_area_id || undefined,
          contact_person: data.contact_person,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          billing_address_line1: data.billing_address_line1,
          billing_address_line2: data.billing_address_line2,
          billing_city: data.billing_city,
          billing_state: data.billing_state,
          billing_pincode: data.billing_pincode,
          same_as_billing: data.same_as_billing,
          installation_address_line1: data.installation_address_line1,
          installation_address_line2: data.installation_address_line2,
          installation_city: data.installation_city,
          installation_state: data.installation_state,
          installation_pincode: data.installation_pincode,
          registration_approval_mode: data.registration_approval_mode || 'auto',
          max_bandwidth: data.max_bandwidth || '1gbit',
          enable_volume_control: data.enable_volume_control ?? !isRegisterFirst,
          enable_password_login: isRegisterFirst ? false : (data.enable_password_login ?? true),
          enable_otp_login: isRegisterFirst ? false : (data.enable_otp_login ?? false),
          mac_binding: true, // Enforced true for all customers
          session_timeout: data.session_timeout,
          idle_timeout: data.idle_timeout,
          max_concurrent_sessions: data.max_concurrent_sessions,
          total_users: data.total_users,
          concurrent_users: data.concurrent_users,
          dhcp_lease_time: data.dhcp_lease_time,
          enable_mac_whitelist: data.enable_mac_whitelist,
          daily_data_limit_mb: data.daily_data_limit_mb,
          data_limit_mb: data.data_limit_mb,
          approval_otp_validity_minutes: data.approval_otp_validity_minutes,
          welcome_message: data.welcome_message,
          terms_url: data.terms_url,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          branch_name: isRegisterFirst ? data.branch_name : undefined,
          branch_code: isRegisterFirst ? data.branch_code : undefined,
          manager_name: isRegisterFirst ? data.manager_name : undefined,
          manager_phone: isRegisterFirst ? data.manager_phone : undefined,
          manager_email: isRegisterFirst ? data.manager_email : undefined,
          bandwidth_profiles: bandwidthProfiles,
        }
        const created = await ebApi.create(createPayload)
        savedId = created.id
      }

      if (!savedId) throw new Error('Customer ID missing for asset upload')

      // Upload selected image assets
      if (logoFile) {
        setUploadStatus('Uploading customer logo...')
        await ebApi.uploadLogo(savedId, logoFile)
      }
      if (bannerFile) {
        setUploadStatus('Uploading banner image...')
        await ebApi.uploadBanner(savedId, bannerFile)
      }

      // Sync and publish configured Legal Documents (ToS, Privacy, FUP)
      setUploadStatus('Publishing legal compliance documents...')
      const docTypes: Array<'tos' | 'privacy' | 'fup'> = ['tos', 'privacy', 'fup']
      for (const dt of docTypes) {
        try {
          const doc = legalDocs[dt]
          await ebApi.updateLegalDoc(savedId, dt, {
            title: doc.title,
            body_html: doc.body_html,
            effective_date: doc.effective_date,
            requires_reacceptance: doc.requires_reacceptance,
          })
        } catch {
          // If captive portal is not yet provisioned, ignore harmlessly
        }
      }

      return savedId
    },
    onSuccess: (savedId) => {
      queryClient.invalidateQueries({ queryKey: ['eb-customers'] })
      queryClient.invalidateQueries({ queryKey: ['eb-customer', savedId] })
      queryClient.invalidateQueries({ queryKey: ['eb-legal-docs', savedId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success(
        isEdit
          ? 'Customer details and legal compliance terms updated successfully'
          : 'Customer created and compliance policies published successfully'
      )
      navigate(`/eb/customers/${savedId}`)
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to save customer'))
    },
    onSettled: () => {
      setUploadStatus(null)
    },
  })

  const onSubmit = (data: FormValues) => {
    saveMutation.mutate(data)
  }

  if (isEdit && isFetchingCustomer) return <PageLoader />

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={isEdit ? `Edit Customer: ${existingCustomer?.company_name}` : 'New Customer Onboarding'}
        subtitle="Staging form for commercial identity, capacity planning, portal policies, and billing details"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/eb/customers')}
            className="gap-1.5 h-8 text-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </Button>
        }
      />

      <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
        {/* Upload & Save Banner */}
        {uploadStatus && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3 text-primary animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">{uploadStatus}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ── SECTION 1: Corporate Identity ─────────────────────────────── */}
          <Card>
            <div
              onClick={() => toggleSection(1)}
              className="p-5 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Section 1 — Corporate Identity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Legal entity name, customer type, GSTIN, CIN, user account, and primary contact
                  </p>
                </div>
              </div>
              <button type="button" className="text-slate-500 p-1">
                {openSections[1] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>

            {openSections[1] && (
              <CardBody className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Company Name <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="Acme Enterprises Pvt Ltd"
                      {...register('company_name')}
                      error={errors.company_name?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Customer Type <span className="text-danger">*</span>
                    </label>
                    <Select
                      value={watch('customer_type') || 'general'}
                      onChange={(e) => handleCustomerTypeChange(e.target.value as 'general' | 'register_first')}
                      options={[
                        { value: 'general', label: 'General Enterprise (Pre-configured Users & Login)' },
                        { value: 'register_first', label: 'Register First (Retail / Walk-in / Branch)' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      User Account <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="acme_corp"
                      {...register('user_account')}
                      error={errors.user_account?.message}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Enterprise account identifier / billing code
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      GSTIN <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="32AABCU9603R1ZX"
                      {...register('gstin')}
                      error={errors.gstin?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      CIN <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="U72200KL2020PTC061234"
                      {...register('cin')}
                      error={errors.cin?.message}
                    />
                  </div>

                  {isSuper ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Circle <span className="text-danger">*</span>
                        </label>
                        <Select
                          value={watchedCircleId?.toString() || ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined
                            setValue('circle_id', val)
                            setValue('business_area_id', undefined)
                          }}
                          options={[
                            { value: '', label: 'Select Circle' },
                            ...circles.map((c) => ({ value: c.id.toString(), label: `${c.name} (${c.code})` })),
                          ]}
                        />
                        {errors.circle_id && (
                          <p className="text-xs text-danger mt-1">{errors.circle_id.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Business Area <span className="text-danger">*</span>
                        </label>
                        <Select
                          value={watchedBAId?.toString() || ''}
                          onChange={(e) =>
                            setValue('business_area_id', e.target.value ? Number(e.target.value) : undefined)
                          }
                          options={[
                            { value: '', label: 'Select Business Area' },
                            ...filteredBAs.map((ba) => ({ value: ba.id.toString(), label: `${ba.name} (${ba.code})` })),
                          ]}
                          disabled={!watchedCircleId}
                        />
                        {errors.business_area_id && (
                          <p className="text-xs text-danger mt-1">{errors.business_area_id.message}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="col-span-full bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500">Regional Scope:</span>{' '}
                        <span className="font-semibold text-slate-900">
                          {user?.profile?.circle?.name || 'Circle'} — {user?.profile?.business_area?.name || 'BA'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="col-span-full">
                    <label className="block text-xs font-semibold text-slate-900 mb-1">Location / Campus</label>
                    <Input
                      placeholder="e.g. Technopark Phase 3, Trivandrum"
                      {...register('location')}
                      error={errors.location?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Contact Person <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="Jane Doe"
                      {...register('contact_person')}
                      error={errors.contact_person?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Contact Email <span className="text-danger">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="jane@acme.example"
                      {...register('contact_email')}
                      error={errors.contact_email?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Contact Phone (10 digits) <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="9876543210"
                      {...register('contact_phone')}
                      error={errors.contact_phone?.message}
                    />
                  </div>
                </div>
              </CardBody>
            )}
          </Card>

          {/* ── SECTION 2: Capacity Planning & Portal Policies ─────────────── */}
          <Card>
            <div
              onClick={() => toggleSection(2)}
              className="p-5 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Section 2 — Capacity Planning, Bandwidth & Portal Policies
                  </h3>
                  <p className="text-xs text-slate-500">
                    Subscribed WAN bandwidth, user concurrency sizing, quota control, and session timeouts
                  </p>
                </div>
              </div>
              <button type="button" className="text-slate-500 p-1">
                {openSections[2] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>

            {openSections[2] && (
              <CardBody className="space-y-6 pt-4">
                {/* ── Capacity & Bandwidth Box (Adjustable by EB Admin) ── */}
                <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                        Subscribed WAN Bandwidth & User Capacity Sizing
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                      EB Adjustable
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Define the customer's total subscribed WAN bandwidth profile and user base. Peak concurrent active devices determine the carved IP pool and DHCP subnet.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* WAN Bandwidth */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-900 mb-1">
                        Subscribed WAN Bandwidth <span className="text-danger">*</span>
                      </label>
                      <Select
                        value={watch('max_bandwidth') || '1gbit'}
                        onChange={(e) => setValue('max_bandwidth', e.target.value)}
                        options={[
                          { value: '1gbit', label: '1 Gbps (Gigabit Line)' },
                          { value: '500mbit', label: '500 Mbps' },
                          { value: '200mbit', label: '200 Mbps' },
                          { value: '100mbit', label: '100 Mbps (Standard)' },
                          { value: '50mbit', label: '50 Mbps' },
                          { value: '20mbit', label: '20 Mbps' },
                          { value: '10mbit', label: '10 Mbps' },
                        ]}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Traffic shaper ceiling for customer</p>
                    </div>

                    {/* Total Users */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-900 mb-1">
                        Total Registered Accounts <span className="text-danger">*</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="100"
                        {...register('total_users')}
                        error={errors.total_users?.message}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Total subscriber accounts in directory</p>
                    </div>

                    {/* Peak Concurrent Users */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-900">
                          Peak Concurrent Users
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setValue('concurrent_users', Math.round(watchedTotalUsers * 0.25))}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                          >
                            25%
                          </button>
                          <button
                            type="button"
                            onClick={() => setValue('concurrent_users', Math.round(watchedTotalUsers * 0.5))}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            onClick={() => setValue('concurrent_users', watchedTotalUsers)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                          >
                            100%
                          </button>
                        </div>
                      </div>
                      <Input
                        type="number"
                        placeholder="0 (Defaults to 100%)"
                        {...register('concurrent_users')}
                        error={errors.concurrent_users?.message}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Simultaneous active WiFi clients at rush hours</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Guard Buffer Percentage */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-900 mb-1">
                        IP Pool Guard Buffer (%)
                      </label>
                      <Select
                        value={watchedBufferPct.toString()}
                        onChange={(e) => setValue('guard_buffer_pct', Number(e.target.value))}
                        options={[
                          { value: '10', label: '10% Additional Buffer' },
                          { value: '20', label: '20% Additional Buffer' },
                          { value: '25', label: '25% Additional Buffer (Recommended Standard)' },
                          { value: '30', label: '30% Additional Buffer' },
                          { value: '50', label: '50% Additional Buffer (High Turnover)' },
                        ]}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Safety headroom above peak devices to prevent DHCP exhaustion</p>
                    </div>

                    {/* DHCP Lease Time */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-900">
                          DHCP Lease Time (seconds)
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setValue('dhcp_lease_time', 900)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                          >
                            15m
                          </button>
                          <button
                            type="button"
                            onClick={() => setValue('dhcp_lease_time', 3600)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                          >
                            1h
                          </button>
                          <button
                            type="button"
                            onClick={() => setValue('dhcp_lease_time', 28800)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                          >
                            8h
                          </button>
                        </div>
                      </div>
                      <Input
                        type="number"
                        placeholder="900"
                        {...register('dhcp_lease_time')}
                        error={errors.dhcp_lease_time?.message}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">900s (15 mins) recommended for high-turnover public WiFi</p>
                    </div>
                  </div>

                  {/* Sizing Preview Box */}
                  <div className="bg-white rounded-lg p-3 border border-indigo-200/70 text-xs shadow-2xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-50 pb-2">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                        Calculated Subnet Allocation (with {capacityEstimate.bufferPct}% Guard Buffer)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-100 text-indigo-800">
                        /{capacityEstimate.prefix} Subnet ({capacityEstimate.totalIps} Total Host IPs)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 text-[11px]">
                      <div>
                        Target Peak Users: <strong className="text-slate-900">{capacityEstimate.target}</strong> ({capacityEstimate.concurrencyRatio}%)
                      </div>
                      <div>
                        Guard Buffer: <strong className="text-slate-900">+{capacityEstimate.buffer} IPs</strong>
                      </div>
                      <div>
                        Client Usable Pool: <strong className="text-slate-900">{capacityEstimate.clientAssignable} IPs</strong>
                      </div>
                      <div>
                        Pool Efficiency: <strong className="text-slate-900">{capacityEstimate.efficiency}%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Bandwidth Profiles (Bronze, Silver, Gold, Platinum & LAN-Only) ── */}
                <div className="border border-slate-200 bg-white rounded-xl p-5 space-y-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Gauge className="h-5 w-5 text-primary" />
                        <h4 className="text-sm font-bold text-slate-900">
                          User Bandwidth Profiles & Speed Tiers
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure speed tiers available to subscribers. Bronze is always active as the default tier; enable Silver, Gold, or Platinum as needed.
                      </p>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('bronze_only')}
                        className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                      >
                        Bronze Only
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('bronze_gold')}
                        className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                      >
                        Bronze & Gold
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('bronze_silver_gold')}
                        className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                      >
                        3 Tiers
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('all_four')}
                        className="text-[11px] px-2.5 py-1 rounded-md border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition-colors"
                      >
                        All 4 Tiers
                      </button>
                    </div>
                  </div>

                  {/* Profile Tier Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bandwidthProfiles.map((p) => {
                      const isBronze = p.profile_name === 'bronze'
                      const tierColors: Record<string, { bg: string; border: string; badge: string; iconColor: string }> = {
                        bronze: { bg: 'bg-amber-50/50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-900', iconColor: 'text-amber-700' },
                        silver: { bg: 'bg-slate-50/70', border: 'border-slate-300', badge: 'bg-slate-200 text-slate-800', iconColor: 'text-slate-700' },
                        gold: { bg: 'bg-yellow-50/60', border: 'border-yellow-300', badge: 'bg-yellow-100 text-yellow-900', iconColor: 'text-yellow-700' },
                        platinum: { bg: 'bg-purple-50/50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-900', iconColor: 'text-purple-700' },
                      }
                      const tc = tierColors[p.profile_name] || tierColors.bronze

                      return (
                        <div
                          key={p.profile_name}
                          className={`rounded-xl border p-4 transition-all ${
                            p.is_active ? `${tc.bg} ${tc.border} shadow-2xs` : 'bg-slate-50/50 border-slate-200 opacity-60'
                          }`}
                        >
                          {/* Header of Tier */}
                          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`profile_active_${p.profile_name}`}
                                checked={p.is_active}
                                disabled={isBronze}
                                onChange={(e) =>
                                  handleProfileFieldChange(p.profile_name, 'is_active', e.target.checked)
                                }
                                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                              />
                              <label
                                htmlFor={`profile_active_${p.profile_name}`}
                                className="text-xs font-bold uppercase tracking-wider text-slate-900 cursor-pointer flex items-center gap-1.5"
                              >
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${tc.badge}`}>
                                  {p.profile_name.toUpperCase()}
                                </span>
                                {isBronze && (
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    (Default Tier)
                                  </span>
                                )}
                              </label>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleResetProfileTier(p.profile_name)}
                              title="Reset to default tier settings"
                              className="text-[11px] text-slate-400 hover:text-slate-700 p-1 flex items-center gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span className="text-[10px]">Reset</span>
                            </button>
                          </div>

                          {/* Profile Fields */}
                          <div className="space-y-3 pt-3">
                            {/* Display Name */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Display Name
                              </label>
                              <Input
                                value={p.display_name}
                                disabled={!p.is_active}
                                onChange={(e) =>
                                  handleProfileFieldChange(p.profile_name, 'display_name', e.target.value)
                                }
                                placeholder="e.g. Bronze - 2M/4M"
                                className="h-8 text-xs"
                              />
                            </div>

                            {/* Download Speeds (Mbps) */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                                  Guaranteed Down (Mbps)
                                </label>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.1"
                                  value={kbpsToMbps(p.rate_bandwidth_down)}
                                  disabled={!p.is_active}
                                  onChange={(e) =>
                                    handleProfileFieldChange(
                                      p.profile_name,
                                      'rate_bandwidth_down',
                                      mbpsToKbps(parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  className="h-8 text-xs"
                                />
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {p.rate_bandwidth_down} kbps
                                </span>
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                                  Burst / Ceil Down (Mbps)
                                </label>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.1"
                                  value={kbpsToMbps(p.ceil_bandwidth_down)}
                                  disabled={!p.is_active}
                                  onChange={(e) =>
                                    handleProfileFieldChange(
                                      p.profile_name,
                                      'ceil_bandwidth_down',
                                      mbpsToKbps(parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  className="h-8 text-xs"
                                />
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {p.ceil_bandwidth_down} kbps
                                </span>
                              </div>
                            </div>

                            {/* Upload Speeds (Mbps) */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                                  Guaranteed Up (Mbps)
                                </label>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.1"
                                  value={kbpsToMbps(p.rate_bandwidth_up)}
                                  disabled={!p.is_active}
                                  onChange={(e) =>
                                    handleProfileFieldChange(
                                      p.profile_name,
                                      'rate_bandwidth_up',
                                      mbpsToKbps(parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  className="h-8 text-xs"
                                />
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {p.rate_bandwidth_up} kbps
                                </span>
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                                  Burst / Ceil Up (Mbps)
                                </label>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.1"
                                  value={kbpsToMbps(p.ceil_bandwidth_up)}
                                  disabled={!p.is_active}
                                  onChange={(e) =>
                                    handleProfileFieldChange(
                                      p.profile_name,
                                      'ceil_bandwidth_up',
                                      mbpsToKbps(parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  className="h-8 text-xs"
                                />
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {p.ceil_bandwidth_up} kbps
                                </span>
                              </div>
                            </div>

                            {/* Priority & LAN-Only Row */}
                            <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-semibold text-slate-700">
                                  TC Priority
                                </label>
                                <select
                                  value={p.priority}
                                  disabled={!p.is_active}
                                  onChange={(e) =>
                                    handleProfileFieldChange(p.profile_name, 'priority', Number(e.target.value))
                                  }
                                  className="h-7 text-xs rounded border-slate-300 bg-white px-2 py-0.5 text-slate-800"
                                >
                                  <option value={1}>1 (Highest)</option>
                                  <option value={2}>2 (High)</option>
                                  <option value={3}>3 (Normal)</option>
                                  <option value={4}>4 (Default / Low)</option>
                                </select>
                              </div>

                              {/* LAN-Only Intranet Group Switch */}
                              <label className="flex items-start gap-2 cursor-pointer bg-white/80 p-2 rounded-lg border border-slate-200/80">
                                <input
                                  type="checkbox"
                                  checked={p.is_lan_only}
                                  disabled={!p.is_active}
                                  onChange={(e) =>
                                    handleProfileFieldChange(p.profile_name, 'is_lan_only', e.target.checked)
                                  }
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-900">
                                      LAN-Only Group (Intranet Only)
                                    </span>
                                    {p.is_lan_only && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800">
                                        Intranet
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                    {p.is_lan_only
                                      ? 'No internet access. Intra-group device sharing with shaped LAN bandwidth.'
                                      : 'Standard internet access enabled.'}
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── Policy & Quota Fields ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Registration Approval Mode
                    </label>
                    <Select
                      value={watch('registration_approval_mode') || 'auto'}
                      onChange={(e) => setValue('registration_approval_mode', e.target.value as 'auto' | 'manual')}
                      options={[
                        { value: 'auto', label: 'Automatic Approval (Default)' },
                        { value: 'manual', label: 'Manual Admin Approval' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Max Concurrent Sessions / User
                    </label>
                    <Input
                      type="number"
                      placeholder="2"
                      {...register('max_concurrent_sessions')}
                      error={errors.max_concurrent_sessions?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Session Timeout (seconds)
                    </label>
                    <Input
                      type="number"
                      placeholder="86400"
                      {...register('session_timeout')}
                      error={errors.session_timeout?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Idle Timeout (seconds)
                    </label>
                    <Input
                      type="number"
                      placeholder="3600"
                      {...register('idle_timeout')}
                      error={errors.idle_timeout?.message}
                    />
                  </div>

                  {watchedVolumeControl && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Daily Data Limit (MB, 0 for unlimited)
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          {...register('daily_data_limit_mb')}
                          error={errors.daily_data_limit_mb?.message}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Total Data Limit (MB, 0 for unlimited)
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          {...register('data_limit_mb')}
                          error={errors.data_limit_mb?.message}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Approval OTP Validity (minutes)
                    </label>
                    <Input
                      type="number"
                      placeholder="180"
                      {...register('approval_otp_validity_minutes')}
                      error={errors.approval_otp_validity_minutes?.message}
                    />
                  </div>
                </div>

                {/* ── Feature Toggles ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Volume Control Checkbox (Checked for general, unchecked for register_first) */}
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-900 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                      {...register('enable_volume_control')}
                    />
                    <div>
                      <span className="font-semibold block">Enable Volume / Quota Control</span>
                      <span className="text-[11px] text-slate-500">
                        {watchedCustomerType === 'general' ? 'Default ON for General Enterprise' : 'Default OFF for Register First'}
                      </span>
                    </div>
                  </label>

                  {/* MAC Whitelist Checkbox */}
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-900 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                      {...register('enable_mac_whitelist')}
                    />
                    <div>
                      <span className="font-semibold block">Enable MAC Whitelist</span>
                      <span className="text-[11px] text-slate-500">Strictly allow only pre-approved MAC addresses</span>
                    </div>
                  </label>

                  {/* Login Options — ONLY visible for General customers */}
                  {watchedCustomerType === 'general' && (
                    <>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-900 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                          {...register('enable_password_login')}
                        />
                        <div>
                          <span className="font-semibold block">Enable Password Login</span>
                          <span className="text-[11px] text-slate-500">Allow users to log in using account password</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-medium text-slate-900 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                          {...register('enable_otp_login')}
                        />
                        <div>
                          <span className="font-semibold block">Enable OTP Login</span>
                          <span className="text-[11px] text-slate-500">Allow users to log in via One-Time Password</span>
                        </div>
                      </label>
                    </>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    <strong>MAC Binding Enforced:</strong> Device hardware MAC addresses are automatically bound upon initial login across all customer types for zero-trust access control.
                  </span>
                </div>
              </CardBody>
            )}
          </Card>

          {/* ── SECTION 3: Branding & Legal Terms ─────────────────────────── */}
          <Card>
            <div
              onClick={() => toggleSection(3)}
              className="p-5 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Section 3 — Branding & Legal Compliance Terms
                  </h3>
                  <p className="text-xs text-slate-500">
                    Custom themes, welcome banners, logos, and editable DOT/TRAI compliance policies (ToS, Privacy, FUP)
                  </p>
                </div>
              </div>
              <button type="button" className="text-slate-500 p-1">
                {openSections[3] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>

            {openSections[3] && (
              <CardBody className="space-y-6 pt-4">
                {/* ── Branding Details ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Welcome Message
                    </label>
                    <Input
                      placeholder="Welcome to Acme High-Speed Wi-Fi"
                      {...register('welcome_message')}
                      error={errors.welcome_message?.message}
                    />
                  </div>

                  <div className="col-span-full">
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      External Terms URL (Optional)
                    </label>
                    <Input
                      placeholder="https://acmecorp.com/terms"
                      {...register('terms_url')}
                      error={errors.terms_url?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Primary Theme Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={watch('primary_color') || '#004aad'}
                        onChange={(e) => setValue('primary_color', e.target.value)}
                        className="h-9 w-9 rounded border border-slate-200 cursor-pointer bg-white"
                      />
                      <Input
                        placeholder="#004aad"
                        {...register('primary_color')}
                        error={errors.primary_color?.message}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Secondary Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={watch('secondary_color') || '#0066cc'}
                        onChange={(e) => setValue('secondary_color', e.target.value)}
                        className="h-9 w-9 rounded border border-slate-200 cursor-pointer bg-white"
                      />
                      <Input
                        placeholder="#0066cc"
                        {...register('secondary_color')}
                        error={errors.secondary_color?.message}
                      />
                    </div>
                  </div>
                </div>

                {/* Uploads Grid (Logo & Banner) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Logo Upload */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                          <ImageIcon className="h-4 w-4 text-primary" /> Customer Logo
                        </span>
                        <span className="text-[10px] text-slate-500">PNG, JPEG, SVG &lt; 5MB</span>
                      </div>

                      {(logoPreview || existingCustomer?.logo) && (
                        <div className="mb-3 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-center h-24 overflow-hidden">
                          <img
                            src={logoPreview || existingCustomer?.logo || ''}
                            alt="Logo Preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <UploadCloud className="h-4 w-4" />
                        {logoFile ? 'Replace Logo' : existingCustomer?.logo ? 'Replace Logo' : 'Select Logo'}
                      </Button>
                      {logoFile && (
                        <p className="text-[11px] text-healthy mt-1 truncate">Selected: {logoFile.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Banner Upload */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                          <ImageIcon className="h-4 w-4 text-primary" /> Banner Image
                        </span>
                        <span className="text-[10px] text-slate-500">PNG, JPEG &lt; 5MB</span>
                      </div>

                      {(bannerPreview || existingCustomer?.banner_image_url) && (
                        <div className="mb-3 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-center h-24 overflow-hidden">
                          <img
                            src={bannerPreview || existingCustomer?.banner_image_url || ''}
                            alt="Banner Preview"
                            className="max-h-full max-w-full object-cover rounded"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                        onChange={handleBannerChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        <UploadCloud className="h-4 w-4" />
                        {bannerFile ? 'Replace Banner' : existingCustomer?.banner_image_url ? 'Replace Banner' : 'Select Banner'}
                      </Button>
                      {bannerFile && (
                        <p className="text-[11px] text-healthy mt-1 truncate">Selected: {bannerFile.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Legal & Compliance Documents Editor (Replaces PDF Upload) ── */}
                <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Legal Compliance Documents & Terms
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Configure interactive Terms of Service, Privacy Policy, and Fair Usage Policy presented to WiFi end-users
                        </p>
                      </div>
                    </div>

                    {/* Tab Selectors */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setActiveLegalTab('tos')}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                          activeLegalTab === 'tos'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Terms of Service (ToS)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLegalTab('privacy')}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                          activeLegalTab === 'privacy'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Privacy Policy
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLegalTab('fup')}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                          activeLegalTab === 'fup'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Fair Usage Policy (FUP)
                      </button>
                    </div>
                  </div>

                  {/* Active Document Form */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Document Title
                        </label>
                        <Input
                          value={legalDocs[activeLegalTab].title}
                          onChange={(e) =>
                            setLegalDocs((prev) => ({
                              ...prev,
                              [activeLegalTab]: {
                                ...prev[activeLegalTab],
                                title: e.target.value,
                              },
                            }))
                          }
                          placeholder="Document Title"
                        />
                      </div>

                      <div className="w-48">
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Effective Date
                        </label>
                        <Input
                          type="date"
                          value={legalDocs[activeLegalTab].effective_date}
                          onChange={(e) =>
                            setLegalDocs((prev) => ({
                              ...prev,
                              [activeLegalTab]: {
                                ...prev[activeLegalTab],
                                effective_date: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="pt-5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResetLegalDoc(activeLegalTab)}
                          className="gap-1.5 text-xs h-9"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restore Default
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-900">
                          Document Content (HTML / Text)
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Supports &lt;h4&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;
                        </span>
                      </div>
                      <textarea
                        rows={8}
                        value={legalDocs[activeLegalTab].body_html}
                        onChange={(e) =>
                          setLegalDocs((prev) => ({
                            ...prev,
                            [activeLegalTab]: {
                              ...prev[activeLegalTab],
                              body_html: e.target.value,
                            },
                          }))
                        }
                        className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 focus:ring-primary focus:border-primary bg-slate-50/50"
                        placeholder="<h4>1. Section Title</h4><p>Terms content...</p>"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={legalDocs[activeLegalTab].requires_reacceptance}
                          onChange={(e) =>
                            setLegalDocs((prev) => ({
                              ...prev,
                              [activeLegalTab]: {
                                ...prev[activeLegalTab],
                                requires_reacceptance: e.target.checked,
                              },
                            }))
                          }
                          className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>Require active users to re-accept this document upon modification</span>
                      </label>

                      <span className="text-[11px] text-slate-500">
                        DOT / TRAI Compliance Audit Trail Enabled
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            )}
          </Card>

          {/* ── SECTION 4: Contact & Addresses ─────────────────────────────── */}
          <Card>
            <div
              onClick={() => toggleSection(4)}
              className="p-5 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Section 4 — Contact & Addresses
                  </h3>
                  <p className="text-xs text-slate-500">
                    Billing and installation addresses {watchedCustomerType === 'register_first' && ', branch code and manager details'}
                  </p>
                </div>
              </div>
              <button type="button" className="text-slate-500 p-1">
                {openSections[4] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>

            {openSections[4] && (
              <CardBody className="space-y-4 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Billing Address
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Address Line 1 <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="Building / Floor / Street"
                      {...register('billing_address_line1')}
                      error={errors.billing_address_line1?.message}
                    />
                  </div>

                  <div className="col-span-full">
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Address Line 2
                    </label>
                    <Input
                      placeholder="Area / Landmark"
                      {...register('billing_address_line2')}
                      error={errors.billing_address_line2?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      City <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="City"
                      {...register('billing_city')}
                      error={errors.billing_city?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      State <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="State"
                      {...register('billing_state')}
                      error={errors.billing_state?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Pincode (6 digits) <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="695581"
                      {...register('billing_pincode')}
                      error={errors.billing_pincode?.message}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-200 text-primary focus:ring-primary h-4 w-4"
                      {...register('same_as_billing')}
                    />
                    <span>Installation address is same as billing address</span>
                  </label>
                </div>

                {!watchedSameAsBilling && (
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Installation Address
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-full">
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Installation Line 1 <span className="text-danger">*</span>
                        </label>
                        <Input
                          placeholder="Premises / Street"
                          {...register('installation_address_line1')}
                          error={errors.installation_address_line1?.message}
                        />
                      </div>

                      <div className="col-span-full">
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Installation Line 2
                        </label>
                        <Input
                          placeholder="Area / Landmark"
                          {...register('installation_address_line2')}
                          error={errors.installation_address_line2?.message}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          City <span className="text-danger">*</span>
                        </label>
                        <Input
                          placeholder="City"
                          {...register('installation_city')}
                          error={errors.installation_city?.message}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          State <span className="text-danger">*</span>
                        </label>
                        <Input
                          placeholder="State"
                          {...register('installation_state')}
                          error={errors.installation_state?.message}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Pincode (6 digits) <span className="text-danger">*</span>
                        </label>
                        <Input
                          placeholder="695581"
                          {...register('installation_pincode')}
                          error={errors.installation_pincode?.message}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Branch & Manager Details — only required and shown for register_first */}
                {watchedCustomerType === 'register_first' && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Branch & Manager Details <span className="text-danger">*</span>
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Required for Register First
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Branch Name <span className="text-danger">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Main City Branch"
                          {...register('branch_name')}
                          error={errors.branch_name?.message}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Branch Code
                        </label>
                        <Input
                          placeholder="BR001"
                          {...register('branch_code')}
                          error={errors.branch_code?.message}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Manager Name <span className="text-danger">*</span>
                        </label>
                        <Input
                          placeholder="John Smith"
                          {...register('manager_name')}
                          error={errors.manager_name?.message}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Manager Phone (10 digits) <span className="text-danger">*</span>
                        </label>
                        <Input
                          placeholder="9876543210"
                          {...register('manager_phone')}
                          error={errors.manager_phone?.message}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Manager Email
                        </label>
                        <Input
                          type="email"
                          placeholder="manager@acmecorp.com"
                          {...register('manager_email')}
                          error={errors.manager_email?.message}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            )}
          </Card>

          {/* ── Form Actions ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/eb/customers')}
              disabled={isSubmitting || saveMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || saveMutation.isPending}
              className="gap-2 px-6"
            >
              {(isSubmitting || saveMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Customer Changes' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
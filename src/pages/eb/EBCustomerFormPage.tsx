import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Building2,
  Network,
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
  ExternalLink,
} from 'lucide-react'

import { ebApi } from '@/api/eb'
import { circlesApi, businessAreasApi } from '@/api/master-data'
import { adminApi } from '@/api/admin'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/store/auth'
import { extractErrorMessage } from '@/lib/axios'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import type {
  CustomerCreate,
  CustomerUpdate,
  BASvlanAllocation,
} from '@/types'

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

function ipToLong(ip: string): number {
  return (
    ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  )
}

const formSchema = z
  .object({
    // Section 1: Corporate Identity
    company_name: z.string().min(2, 'Company name must be at least 2 characters').max(200),
    user_account: z.string().min(2, 'User account is required').max(100),
    gstin: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format (e.g. 32AABCU9603R1ZX)'),
    cin: z.string().min(1, 'CIN is required').max(21, 'CIN must be at most 21 characters'),
    circle_id: z.coerce.number().optional().nullable(),
    business_area_id: z.coerce.number().optional().nullable(),
    location: z.string().max(200).optional(),
    contact_person: z.string().min(2, 'Contact person is required').max(200),
    contact_email: z.string().email('Invalid contact email address'),
    contact_phone: z.string().regex(/^\d{10}$/, 'Must be a 10-digit mobile number'),

    // Section 2: Network & Infrastructure
    svlan_allocation_id: z.coerce.number().optional().nullable(),
    svlan: z.coerce.number().min(1).max(4094).optional().nullable(),
    cvlan: z.coerce.number().min(1).max(4094).optional().nullable(),
    qinq_interface: z.string().max(50).optional(),
    wan_interface: z.string().max(50).optional(),
    start_ip: z.string().optional(),
    end_ip: z.string().optional(),
    qos_mode: z.enum(['per_user', 'hierarchical']).optional(),
    max_bandwidth: z.string().optional(),

    // Section 3: Portal Settings & Policy
    customer_type: z.enum(['general', 'register_first']).optional(),
    registration_approval_mode: z.enum(['auto', 'manual']).optional(),
    enable_password_login: z.boolean().optional(),
    enable_otp_login: z.boolean().optional(),
    portal_entry_mode: z.enum(['login', 'register_first']).optional(),
    portal_domain: z.string().max(255).optional(),
    session_timeout: z.coerce.number().min(300, 'Minimum 300 seconds (5 mins)').optional(),
    idle_timeout: z.coerce.number().min(60, 'Minimum 60 seconds (1 min)').optional(),
    max_concurrent_sessions: z.coerce.number().min(1).max(10).optional(),
    total_users: z.coerce.number().min(1).optional(),
    mac_binding: z.boolean().optional(),
    enable_mac_whitelist: z.boolean().optional(),
    daily_data_limit_mb: z.coerce.number().min(0).optional(),
    data_limit_mb: z.coerce.number().min(0).optional(),
    approval_otp_validity_minutes: z.coerce.number().min(1).optional(),

    // Section 4: Branding & Media
    welcome_message: z.string().optional(),
    terms_url: z.string().optional(),
    primary_color: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color (e.g. #004aad)').optional(),
    secondary_color: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color (e.g. #0066cc)').optional(),

    // Section 5: Contact & Addresses
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
    branch_name: z.string().optional(),
    branch_code: z.string().optional(),
    manager_name: z.string().optional(),
    manager_phone: z.string().optional(),
    manager_email: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate IPv4 format if provided
    if (data.start_ip && !IPV4_REGEX.test(data.start_ip)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid IPv4 address',
        path: ['start_ip'],
      })
    }
    if (data.end_ip && !IPV4_REGEX.test(data.end_ip)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid IPv4 address',
        path: ['end_ip'],
      })
    }

    // Cross-field validation: Start IP and End IP
    if (data.start_ip && data.end_ip && IPV4_REGEX.test(data.start_ip) && IPV4_REGEX.test(data.end_ip)) {
      const startLong = ipToLong(data.start_ip)
      const endLong = ipToLong(data.end_ip)
      if (endLong <= startLong) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End IP must be greater than Start IP',
          path: ['end_ip'],
        })
      }
    }

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

  // Section collapse states
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  })

  const toggleSection = (section: number) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Media files state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [legalDocFile, setLegalDocFile] = useState<File | null>(null)

  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const legalDocInputRef = useRef<HTMLInputElement>(null)

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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    setError,
    clearErrors,
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
      svlan_allocation_id: null,
      svlan: null,
      cvlan: null,
      qinq_interface: '',
      wan_interface: 'eth0',
      start_ip: '',
      end_ip: '',
      qos_mode: 'per_user',
      max_bandwidth: '1gbit',
      customer_type: 'general',
      registration_approval_mode: 'manual',
      enable_password_login: true,
      enable_otp_login: false,
      portal_entry_mode: 'login',
      portal_domain: '',
      session_timeout: 86400,
      idle_timeout: 3600,
      max_concurrent_sessions: 2,
      total_users: 100,
      mac_binding: false,
      enable_mac_whitelist: false,
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

  const watchedCircleId = useWatch({ control, name: 'circle_id' })
  const watchedBAId = useWatch({ control, name: 'business_area_id' })
  const watchedSvlanAllocId = useWatch({ control, name: 'svlan_allocation_id' })
  const watchedCvlan = useWatch({ control, name: 'cvlan' })
  const watchedSameAsBilling = useWatch({ control, name: 'same_as_billing' })
  const watchedPrimaryColor = useWatch({ control, name: 'primary_color' })
  const watchedSecondaryColor = useWatch({ control, name: 'secondary_color' })

  // Filter Business Areas by selected Circle
  const filteredBAs = useMemo(() => {
    if (!watchedCircleId) return businessAreas
    return businessAreas.filter((ba) => ba.circle_id === Number(watchedCircleId))
  }, [businessAreas, watchedCircleId])

  // Fetch SVLAN allocations for selected Business Area
  const activeBaId = watchedBAId ? Number(watchedBAId) : null
  const { data: svlanAllocations = [] } = useQuery<BASvlanAllocation[]>({
    queryKey: ['ba-svlan-allocations', activeBaId],
    queryFn: () => adminApi.listBASvlanAllocations(activeBaId!),
    enabled: Boolean(activeBaId),
  })

  // Set SVLAN and validate CVLAN against selected allocation
  useEffect(() => {
    if (!watchedSvlanAllocId || svlanAllocations.length === 0) return

    const selectedAlloc = svlanAllocations.find((a) => a.id === Number(watchedSvlanAllocId))
    if (selectedAlloc) {
      setValue('svlan', selectedAlloc.svlan)

      if (watchedCvlan !== undefined && watchedCvlan !== null) {
        if (
          watchedCvlan < selectedAlloc.cvlan_range_start ||
          watchedCvlan > selectedAlloc.cvlan_range_end
        ) {
          setError('cvlan', {
            type: 'manual',
            message: `CVLAN must be within allocation range (${selectedAlloc.cvlan_range_start} – ${selectedAlloc.cvlan_range_end})`,
          })
        } else {
          clearErrors('cvlan')
        }
      }
    }
  }, [watchedSvlanAllocId, watchedCvlan, svlanAllocations, setValue, setError, clearErrors])

  // Pre-fill form in Edit mode
  useEffect(() => {
    if (!existingCustomer) return

    setValue('company_name', existingCustomer.company_name || '')
    setValue('user_account', existingCustomer.user_account || '')
    setValue('gstin', existingCustomer.gstin || '')
    setValue('cin', existingCustomer.cin || '')
    setValue('circle_id', existingCustomer.circle_id || user?.profile?.circle?.id || undefined)
    setValue('business_area_id', existingCustomer.business_area_id || user?.profile?.business_area?.id || undefined)
    setValue('location', existingCustomer.location || '')
    setValue('contact_person', existingCustomer.contact_person || '')
    setValue('contact_email', existingCustomer.contact_email || '')
    setValue('contact_phone', existingCustomer.contact_phone || '')

    setValue('qinq_interface', existingCustomer.qinq_interface || '')
    setValue('wan_interface', existingCustomer.wan_interface || 'eth0')
    setValue('svlan', existingCustomer.svlan || null)
    setValue('cvlan', existingCustomer.cvlan || null)
    setValue('start_ip', existingCustomer.start_ip || '')
    setValue('end_ip', existingCustomer.end_ip || '')
    setValue('qos_mode', (existingCustomer.qos_mode as 'per_user' | 'hierarchical') || 'per_user')
    setValue('max_bandwidth', existingCustomer.max_bandwidth || '1gbit')

    setValue('customer_type', (existingCustomer.customer_type as 'general' | 'register_first') || 'general')
    setValue(
      'registration_approval_mode',
      (existingCustomer.registration_approval_mode as 'auto' | 'manual') || 'manual'
    )
    setValue('enable_password_login', existingCustomer.enable_password_login ?? true)
    setValue('enable_otp_login', existingCustomer.enable_otp_login ?? false)
    setValue(
      'portal_entry_mode',
      (existingCustomer.portal_entry_mode as 'login' | 'register_first') || 'login'
    )
    setValue('portal_domain', existingCustomer.portal_domain || '')
    setValue('session_timeout', existingCustomer.session_timeout || 86400)
    setValue('idle_timeout', existingCustomer.idle_timeout || 3600)
    setValue('max_concurrent_sessions', existingCustomer.max_concurrent_sessions || 2)
    setValue('total_users', existingCustomer.total_users || 100)
    setValue('mac_binding', existingCustomer.mac_binding ?? false)
    setValue('enable_mac_whitelist', existingCustomer.enable_mac_whitelist ?? false)
    setValue('daily_data_limit_mb', existingCustomer.daily_data_limit_mb || 0)
    setValue('data_limit_mb', existingCustomer.data_limit_mb || 0)
    setValue('approval_otp_validity_minutes', existingCustomer.approval_otp_validity_minutes || 180)

    setValue('welcome_message', existingCustomer.welcome_message || '')
    setValue('terms_url', existingCustomer.terms_url || '')
    setValue('primary_color', existingCustomer.primary_color || '#004aad')
    setValue('secondary_color', existingCustomer.secondary_color || '#0066cc')

    setValue('billing_address_line1', existingCustomer.billing_address_line1 || '')
    setValue('billing_address_line2', existingCustomer.billing_address_line2 || '')
    setValue('billing_city', existingCustomer.billing_city || '')
    setValue('billing_state', existingCustomer.billing_state || '')
    setValue('billing_pincode', existingCustomer.billing_pincode || '')
    setValue('same_as_billing', existingCustomer.same_as_billing ?? true)
    setValue('installation_address_line1', existingCustomer.installation_address_line1 || '')
    setValue('installation_address_line2', existingCustomer.installation_address_line2 || '')
    setValue('installation_city', existingCustomer.installation_city || '')
    setValue('installation_state', existingCustomer.installation_state || '')
    setValue('installation_pincode', existingCustomer.installation_pincode || '')

    setValue('branch_name', existingCustomer.branch_name || '')
    setValue('branch_code', existingCustomer.branch_code || '')
    setValue('manager_name', existingCustomer.manager_name || '')
    setValue('manager_phone', existingCustomer.manager_phone || '')
    setValue('manager_email', existingCustomer.manager_email || '')
  }, [existingCustomer, setValue, user])

  // Handle Logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      toast.error('Invalid logo format. Allowed: PNG, JPEG, SVG')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo file exceeds 5MB size limit')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  // Handle Banner file selection
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/png', 'image/jpeg']
    if (!allowed.includes(file.type)) {
      toast.error('Invalid banner format. Allowed: PNG, JPEG')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Banner file exceeds 5MB size limit')
      return
    }
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  // Handle Legal Doc file selection
  const handleLegalDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Invalid document format. Allowed: PDF only')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Legal document exceeds 5MB size limit')
      return
    }
    setLegalDocFile(file)
  }

  // Mutation for saving customer and uploading assets
  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      let savedId = customerId

      if (isEdit && customerId) {
        setUploadStatus('Updating customer records...')
        const updatePayload: CustomerUpdate = {
          ...data,
          cin: data.cin || null,
          circle_id: data.circle_id || undefined,
          business_area_id: data.business_area_id || undefined,
          user_account: existingCustomer?.user_account, // immutable
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
          enable_password_login: data.enable_password_login,
          enable_otp_login: data.enable_otp_login,
          portal_entry_mode: data.portal_entry_mode,
          portal_domain: data.portal_domain,
          session_timeout: data.session_timeout,
          idle_timeout: data.idle_timeout,
          max_concurrent_sessions: data.max_concurrent_sessions,
          total_users: data.total_users,
          mac_binding: data.mac_binding,
          enable_mac_whitelist: data.enable_mac_whitelist,
          daily_data_limit_mb: data.daily_data_limit_mb,
          data_limit_mb: data.data_limit_mb,
          approval_otp_validity_minutes: data.approval_otp_validity_minutes,
          welcome_message: data.welcome_message,
          terms_url: data.terms_url,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          branch_name: data.branch_name,
          branch_code: data.branch_code,
          manager_name: data.manager_name,
          manager_phone: data.manager_phone,
          manager_email: data.manager_email,
        }
        const created = await ebApi.create(createPayload)
        savedId = created.id
      }

      if (!savedId) throw new Error('Customer ID missing for asset upload')

      // Upload selected files
      if (logoFile) {
        setUploadStatus('Uploading customer logo...')
        await ebApi.uploadLogo(savedId, logoFile)
      }
      if (bannerFile) {
        setUploadStatus('Uploading banner image...')
        await ebApi.uploadBanner(savedId, bannerFile)
      }
      if (legalDocFile) {
        setUploadStatus('Uploading legal document...')
        await ebApi.uploadLegalDoc(savedId, legalDocFile)
      }

      return savedId
    },
    onSuccess: (savedId) => {
      queryClient.invalidateQueries({ queryKey: ['eb-customers'] })
      queryClient.invalidateQueries({ queryKey: ['eb-customer', savedId] })
      setUploadStatus(null)

      toast.success(
        (t) => (
          <div className="flex items-center gap-2">
            <span>Customer successfully {isEdit ? 'updated' : 'created'}!</span>
            <Link
              to={`/eb/customers/${savedId}`}
              onClick={() => toast.dismiss(t.id)}
              className="text-primary underline font-medium hover:text-primary/80"
            >
              View Customer
            </Link>
          </div>
        ),
        { duration: 5000 }
      )
      navigate(`/eb/customers`)
    },
    onError: (err) => {
      setUploadStatus(null)
      const msg = extractErrorMessage(err)
      toast.error(msg || 'Failed to save customer. Please check the form.')
    },
  })

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values)
  }

  if (isEdit && isFetchingCustomer) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <PageHeader
        title={isEdit ? `Edit Customer: ${existingCustomer?.company_name || ''}` : 'New EB Customer'}
        description="Comprehensive staging profile for enterprise broadband wifi customer onboarding"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/eb/customers')}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </Button>
        }
      />

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
            className="p-5 border-b border-hairline flex items-center justify-between cursor-pointer hover:bg-surface-2/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Section 1 — Corporate Identity
                </h3>
                <p className="text-xs text-muted-foreground">
                  Legal entity name, GSTIN, CIN, user account, and primary contact
                </p>
              </div>
            </div>
            <button type="button" className="text-muted-foreground p-1">
              {openSections[1] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {openSections[1] && (
            <CardBody className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Company Name <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="Acme Enterprises Pvt Ltd"
                    {...register('company_name')}
                    error={errors.company_name?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    User Account <span className="text-danger">*</span>{' '}
                    {isEdit && <span className="text-muted-foreground font-normal">(Immutable)</span>}
                  </label>
                  <Input
                    placeholder="acme_corp"
                    {...register('user_account')}
                    disabled={isEdit}
                    error={errors.user_account?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    GSTIN <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="32AABCU9603R1ZX"
                    {...register('gstin')}
                    error={errors.gstin?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
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
                      <label className="block text-xs font-semibold text-foreground mb-1">
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
                      <label className="block text-xs font-semibold text-foreground mb-1">
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
                  <div className="col-span-full bg-surface-2/40 p-3 rounded-lg border border-hairline flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground">Regional Scope:</span>{' '}
                      <span className="font-semibold text-foreground">
                        {user?.profile?.circle?.name || 'Circle'} — {user?.profile?.business_area?.name || 'BA'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="col-span-full">
                  <label className="block text-xs font-semibold text-foreground mb-1">Location / Campus</label>
                  <Input
                    placeholder="e.g. Technopark Phase 3, Trivandrum"
                    {...register('location')}
                    error={errors.location?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Contact Person <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="Jane Doe"
                    {...register('contact_person')}
                    error={errors.contact_person?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
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
                  <label className="block text-xs font-semibold text-foreground mb-1">
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

        {/* ── SECTION 2: Network & Infrastructure ─────────────────────────── */}
        <Card>
          <div
            onClick={() => toggleSection(2)}
            className="p-5 border-b border-hairline flex items-center justify-between cursor-pointer hover:bg-surface-2/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Section 2 — Network & Infrastructure
                </h3>
                <p className="text-xs text-muted-foreground">
                  VLAN allocations, interface assignments, IPv4 subnets, and QoS modes
                </p>
              </div>
            </div>
            <button type="button" className="text-muted-foreground p-1">
              {openSections[2] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {openSections[2] && (
            <CardBody className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    SVLAN Allocation Pool
                  </label>
                  <Select
                    value={watchedSvlanAllocId?.toString() || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null
                      setValue('svlan_allocation_id', val)
                    }}
                    options={[
                      { value: '', label: 'Select SVLAN Allocation' },
                      ...svlanAllocations.map((a) => ({
                        value: a.id.toString(),
                        label: `SVLAN ${a.svlan} — CVLAN ${a.cvlan_range_start}–${a.cvlan_range_end} ${
                          a.is_exhausted ? '(Exhausted)' : ''
                        }`,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Customer CVLAN
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 100"
                    {...register('cvlan')}
                    error={errors.cvlan?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    QinQ Interface
                  </label>
                  <Input
                    placeholder="eth2"
                    {...register('qinq_interface')}
                    error={errors.qinq_interface?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    WAN Interface
                  </label>
                  <Input
                    placeholder="eth0"
                    {...register('wan_interface')}
                    error={errors.wan_interface?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Start IP Address
                  </label>
                  <Input
                    placeholder="10.10.1.2"
                    {...register('start_ip')}
                    error={errors.start_ip?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    End IP Address
                  </label>
                  <Input
                    placeholder="10.10.1.254"
                    {...register('end_ip')}
                    error={errors.end_ip?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    QoS Mode
                  </label>
                  <Select
                    value={watch('qos_mode') || 'per_user'}
                    onChange={(e) => setValue('qos_mode', e.target.value as 'per_user' | 'hierarchical')}
                    options={[
                      { value: 'per_user', label: 'Per User (Default)' },
                      { value: 'hierarchical', label: 'Hierarchical QoS' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Max Bandwidth (TC Profile)
                  </label>
                  <Input
                    placeholder="1gbit, 100mbit"
                    {...register('max_bandwidth')}
                    error={errors.max_bandwidth?.message}
                  />
                </div>
              </div>
            </CardBody>
          )}
        </Card>

        {/* ── SECTION 3: Portal Settings & Policy ────────────────────────── */}
        <Card>
          <div
            onClick={() => toggleSection(3)}
            className="p-5 border-b border-hairline flex items-center justify-between cursor-pointer hover:bg-surface-2/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Section 3 — Portal Settings & Policy
                </h3>
                <p className="text-xs text-muted-foreground">
                  Authentication modes, session timeouts, concurrent limits, and MAC controls
                </p>
              </div>
            </div>
            <button type="button" className="text-muted-foreground p-1">
              {openSections[3] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {openSections[3] && (
            <CardBody className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Customer Type
                  </label>
                  <Select
                    value={watch('customer_type') || 'general'}
                    onChange={(e) => setValue('customer_type', e.target.value as 'general' | 'register_first')}
                    options={[
                      { value: 'general', label: 'General Enterprise' },
                      { value: 'register_first', label: 'Register First (Retail/Branch)' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Registration Approval Mode
                  </label>
                  <Select
                    value={watch('registration_approval_mode') || 'manual'}
                    onChange={(e) => setValue('registration_approval_mode', e.target.value as 'auto' | 'manual')}
                    options={[
                      { value: 'manual', label: 'Manual Admin Approval' },
                      { value: 'auto', label: 'Automatic Approval' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Portal Entry Mode
                  </label>
                  <Select
                    value={watch('portal_entry_mode') || 'login'}
                    onChange={(e) => setValue('portal_entry_mode', e.target.value as 'login' | 'register_first')}
                    options={[
                      { value: 'login', label: 'Login Screen' },
                      { value: 'register_first', label: 'Registration Screen' },
                    ]}
                  />
                </div>

                <div className="col-span-full md:col-span-1">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Portal Domain Name
                  </label>
                  <Input
                    placeholder="wifi.acmecorp.com"
                    {...register('portal_domain')}
                    error={errors.portal_domain?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
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
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Idle Timeout (seconds)
                  </label>
                  <Input
                    type="number"
                    placeholder="3600"
                    {...register('idle_timeout')}
                    error={errors.idle_timeout?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
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
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Total Allowed Users
                  </label>
                  <Input
                    type="number"
                    placeholder="100"
                    {...register('total_users')}
                    error={errors.total_users?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Daily Data Limit (MB, 0 = unlimited)
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    {...register('daily_data_limit_mb')}
                    error={errors.daily_data_limit_mb?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Total Data Limit (MB, 0 = unlimited)
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    {...register('data_limit_mb')}
                    error={errors.data_limit_mb?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
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

              {/* Checkbox Options */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer bg-surface-2/40 p-3 rounded-lg border border-hairline hover:bg-surface-2 transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-hairline text-primary focus:ring-primary h-4 w-4"
                    {...register('enable_password_login')}
                  />
                  <span>Enable Password Login</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer bg-surface-2/40 p-3 rounded-lg border border-hairline hover:bg-surface-2 transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-hairline text-primary focus:ring-primary h-4 w-4"
                    {...register('enable_otp_login')}
                  />
                  <span>Enable OTP Login</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer bg-surface-2/40 p-3 rounded-lg border border-hairline hover:bg-surface-2 transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-hairline text-primary focus:ring-primary h-4 w-4"
                    {...register('mac_binding')}
                  />
                  <span>Enable MAC Binding</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer bg-surface-2/40 p-3 rounded-lg border border-hairline hover:bg-surface-2 transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-hairline text-primary focus:ring-primary h-4 w-4"
                    {...register('enable_mac_whitelist')}
                  />
                  <span>Enable MAC Whitelist</span>
                </label>
              </div>
            </CardBody>
          )}
        </Card>

        {/* ── SECTION 4: Branding & Media ────────────────────────────────── */}
        <Card>
          <div
            onClick={() => toggleSection(4)}
            className="p-5 border-b border-hairline flex items-center justify-between cursor-pointer hover:bg-surface-2/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Section 4 — Branding & Media
                </h3>
                <p className="text-xs text-muted-foreground">
                  Portal themes, welcome text, terms URL, logo, banner, and legal documents
                </p>
              </div>
            </div>
            <button type="button" className="text-muted-foreground p-1">
              {openSections[4] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {openSections[4] && (
            <CardBody className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Welcome Message
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Welcome to Acme WiFi Portal. Please log in with your corporate credentials."
                    className="w-full text-xs rounded-lg border border-hairline bg-surface p-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    {...register('welcome_message')}
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Terms & Conditions URL
                  </label>
                  <Input
                    placeholder="https://acmecorp.com/terms"
                    {...register('terms_url')}
                    error={errors.terms_url?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={watchedPrimaryColor || '#004aad'}
                      onChange={(e) => setValue('primary_color', e.target.value)}
                      className="h-9 w-9 rounded border border-hairline cursor-pointer bg-surface"
                    />
                    <Input
                      placeholder="#004aad"
                      {...register('primary_color')}
                      error={errors.primary_color?.message}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Secondary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={watchedSecondaryColor || '#0066cc'}
                      onChange={(e) => setValue('secondary_color', e.target.value)}
                      className="h-9 w-9 rounded border border-hairline cursor-pointer bg-surface"
                    />
                    <Input
                      placeholder="#0066cc"
                      {...register('secondary_color')}
                      error={errors.secondary_color?.message}
                    />
                  </div>
                </div>
              </div>

              {/* Uploads Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Logo Upload */}
                <div className="bg-surface-2/40 border border-hairline rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-primary" /> Customer Logo
                      </span>
                      <span className="text-[10px] text-muted-foreground">PNG, JPEG, SVG &lt; 5MB</span>
                    </div>

                    {(logoPreview || existingCustomer?.logo) && (
                      <div className="mb-3 bg-surface p-2 rounded-lg border border-hairline flex items-center justify-center h-24 overflow-hidden">
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
                <div className="bg-surface-2/40 border border-hairline rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-primary" /> Banner Image
                      </span>
                      <span className="text-[10px] text-muted-foreground">PNG, JPEG &lt; 5MB</span>
                    </div>

                    {(bannerPreview || existingCustomer?.banner_image_url) && (
                      <div className="mb-3 bg-surface p-2 rounded-lg border border-hairline flex items-center justify-center h-24 overflow-hidden">
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

                {/* Legal Doc Upload */}
                <div className="bg-surface-2/40 border border-hairline rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-primary" /> Legal Doc / Agreement
                      </span>
                      <span className="text-[10px] text-muted-foreground">PDF &lt; 5MB</span>
                    </div>

                    {existingCustomer?.legal_doc_url && !legalDocFile && (
                      <div className="mb-3 bg-surface p-3 rounded-lg border border-hairline flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-healthy" /> Uploaded Document
                        </span>
                        <a
                          href={existingCustomer.legal_doc_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <input
                      ref={legalDocInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleLegalDocChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => legalDocInputRef.current?.click()}
                    >
                      <UploadCloud className="h-4 w-4" />
                      {legalDocFile
                        ? 'Replace PDF'
                        : existingCustomer?.legal_doc_url
                        ? 'Replace PDF'
                        : 'Select PDF Document'}
                    </Button>
                    {legalDocFile && (
                      <p className="text-[11px] text-healthy mt-1 truncate">Selected: {legalDocFile.name}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          )}
        </Card>

        {/* ── SECTION 5: Contact & Addresses ─────────────────────────────── */}
        <Card>
          <div
            onClick={() => toggleSection(5)}
            className="p-5 border-b border-hairline flex items-center justify-between cursor-pointer hover:bg-surface-2/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Section 5 — Contact & Addresses
                </h3>
                <p className="text-xs text-muted-foreground">
                  Billing and installation addresses, branch managers, and contact details
                </p>
              </div>
            </div>
            <button type="button" className="text-muted-foreground p-1">
              {openSections[5] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {openSections[5] && (
            <CardBody className="space-y-4 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Billing Address
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Address Line 1 <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="Building / Floor / Street"
                    {...register('billing_address_line1')}
                    error={errors.billing_address_line1?.message}
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Address Line 2
                  </label>
                  <Input
                    placeholder="Area / Landmark"
                    {...register('billing_address_line2')}
                    error={errors.billing_address_line2?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    City <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="City"
                    {...register('billing_city')}
                    error={errors.billing_city?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    State <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="State"
                    {...register('billing_state')}
                    error={errors.billing_state?.message}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
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
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-hairline text-primary focus:ring-primary h-4 w-4"
                    {...register('same_as_billing')}
                  />
                  <span>Installation address is same as billing address</span>
                </label>
              </div>

              {!watchedSameAsBilling && (
                <div className="space-y-4 pt-2 border-t border-hairline">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Installation Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-full">
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Installation Line 1 <span className="text-danger">*</span>
                      </label>
                      <Input
                        placeholder="Premises / Street"
                        {...register('installation_address_line1')}
                        error={errors.installation_address_line1?.message}
                      />
                    </div>

                    <div className="col-span-full">
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Installation Line 2
                      </label>
                      <Input
                        placeholder="Area / Landmark"
                        {...register('installation_address_line2')}
                        error={errors.installation_address_line2?.message}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        City <span className="text-danger">*</span>
                      </label>
                      <Input
                        placeholder="City"
                        {...register('installation_city')}
                        error={errors.installation_city?.message}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        State <span className="text-danger">*</span>
                      </label>
                      <Input
                        placeholder="State"
                        {...register('installation_state')}
                        error={errors.installation_state?.message}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
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

              {/* Branch & Manager Details */}
              <div className="space-y-4 pt-2 border-t border-hairline">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Branch & Manager Details (Optional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Branch Name
                    </label>
                    <Input
                      placeholder="Main Branch"
                      {...register('branch_name')}
                      error={errors.branch_name?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Branch Code
                    </label>
                    <Input
                      placeholder="BR001"
                      {...register('branch_code')}
                      error={errors.branch_code?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Manager Name
                    </label>
                    <Input
                      placeholder="John Smith"
                      {...register('manager_name')}
                      error={errors.manager_name?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Manager Phone (10 digits)
                    </label>
                    <Input
                      placeholder="9876543210"
                      {...register('manager_phone')}
                      error={errors.manager_phone?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
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
  )
}
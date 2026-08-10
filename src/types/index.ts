// ── Auth ──────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginResponse extends TokenResponse {
  user: UserRead
}

export interface PasswordChangeRequest {
  current_password: string
  new_password:     string
}

export interface PasswordChangeResponse {
  message: string
}

// ── Roles ─────────────────────────────────────────────────────────────

export type RoleName =
  | 'SUPER_ADMIN'
  | 'CIRCLE_ADMIN'
  | 'BA_ADMIN'
  | 'BA_NOC_ADMIN'
  | 'BA_EB_ADMIN'
  | 'CUSTOMER'

export const ROLE_LEVELS: Record<RoleName, number> = {
  SUPER_ADMIN:  5,
  CIRCLE_ADMIN: 4,
  BA_ADMIN:     3,
  BA_NOC_ADMIN: 2,
  BA_EB_ADMIN:  2,
  CUSTOMER:     1,
}

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN:  'Super Admin',
  CIRCLE_ADMIN: 'Circle Admin',
  BA_ADMIN:     'BA Admin',
  BA_NOC_ADMIN: 'BA NOC Admin',
  BA_EB_ADMIN:  'BA EB Admin',
  CUSTOMER:     'Customer Admin',
}

export interface RoleRead {
  id:    number
  name:  RoleName
  level: number
}

// ── Master data briefs ────────────────────────────────────────────────

export interface CircleBrief {
  id:   number
  name: string
  code: string
}

export interface BusinessAreaBrief {
  id:   number
  name: string
  code: string
}

export interface CustomerBrief {
  id:                    number
  company_name:          string
  api_token:             string
  captive_customer_slug: string
  primary_color:         string
  secondary_color:       string
  logo:                  string | null
}

// ── Users ─────────────────────────────────────────────────────────────

export interface UserProfileRead {
  role:          RoleRead
  circle:        CircleBrief | null
  business_area: BusinessAreaBrief | null
  customer:      CustomerBrief | null
  personnel_no:  string | null
  designation:   string | null
  mobile:        string | null
}

export interface UserRead {
  id:         number
  username:   string
  email:      string | null
  first_name: string
  last_name:  string
  full_name:  string
  is_active:  boolean
  profile:    UserProfileRead
}

export interface UserCreate {
  username:         string
  password:         string
  first_name:       string
  last_name:        string
  email?:           string
  role_name:        RoleName
  circle_id?:       number
  business_area_id?: number
  customer_id?:     number
  personnel_no?:    string
  designation?:     string
  mobile?:          string
}

export interface UserUpdate {
  first_name?:  string
  last_name?:   string
  email?:       string
  is_active?:   boolean
  designation?: string
  mobile?:      string
}

export interface UserListResponse {
  total: number
  users: UserRead[]
}

// ── Circles ───────────────────────────────────────────────────────────

export interface CircleRead {
  id:         number
  name:       string
  code:       string
  is_active:  boolean
  created_at: string
}

export interface CircleCreate {
  name: string
  code: string
}

export interface CircleUpdate {
  name?:      string
  is_active?: boolean
}

// ── Business Areas ────────────────────────────────────────────────────

export interface BusinessAreaRead {
  id:         number
  name:       string
  code:       string
  circle_id:  number
  is_active:  boolean
  created_at: string
}

export interface BusinessAreaWithCircle extends BusinessAreaRead {
  circle: CircleRead
}

export interface BusinessAreaCreate {
  name:      string
  code:      string
  circle_id: number
}

export interface BusinessAreaUpdate {
  name?:      string
  is_active?: boolean
}

// ── Customers ─────────────────────────────────────────────────────────

export type CustomerStatus = 'DRAFT' | 'READY' | 'PUSHED' | 'ACTIVE' | 'INACTIVE'

export interface CustomerRead {
  id:            number
  company_name:  string
  customer_type: string
  gstin:         string
  cin?:          string | null
  status:        CustomerStatus
  is_active:     boolean
  is_pushed:     boolean
  can_be_pushed: boolean
  primary_color:   string
  secondary_color: string
  logo:            string | null
  welcome_message?: string | null
  terms_url?:       string | null
  contact_person:  string
  contact_email:   string
  contact_phone:   string
  billing_address_line1?: string
  billing_address_line2?: string
  billing_city:    string
  billing_state:   string
  billing_pincode?: string
  same_as_billing?: boolean
  installation_address_line1?: string
  installation_address_line2?: string
  installation_city?: string
  installation_state?: string
  installation_pincode?: string
  total_users:     number
  daily_data_limit_mb: number
  data_limit_mb?:         number | null
  time_limit_minutes?:    number | null
  session_timeout?:       number | null
  idle_timeout?:          number | null
  max_concurrent_sessions?: number | null
  registration_approval_mode: string
  captive_customer_slug: string
  captive_instance_id:   number | null
  qinq_interface?:       string
  wan_interface?:        string
  svlan?:                number | null
  cvlan?:                number | null
  start_ip?:             string
  end_ip?:               string
  qos_mode?:             string
  max_bandwidth:         string
  api_token:       string
  created_at:      string
  updated_at:      string
  pushed_at:       string | null
  portal_entry_mode:          string
  enable_password_login?:     boolean
  enable_otp_login?:          boolean
  otp_login_message?:         string | null
  enable_volume_control:      boolean
  registration_fields_config: Record<string, unknown>
  branch_name:                string
  branch_code:                string
  manager_name:               string
  manager_phone:              string
  manager_email:              string
  branch?: {
    branch_name?:    string | null
    branch_code?:    string | null
    manager_name?:   string | null
    manager_phone?:  string | null
    manager_mobile?: string | null
    manager_email?:  string | null
  } | null
  role_validity_days?:        Record<string, number>
  throttle_bandwidth_up:      number
  throttle_bandwidth_down:    number
}

export interface CustomerCreate {
  company_name:            string
  customer_type?:          string
  gstin:                   string
  cin?:                    string
  primary_color?:          string
  secondary_color?:        string
  welcome_message?:        string
  terms_url?:              string
  contact_person:          string
  contact_email:           string
  contact_phone:           string
  billing_address_line1:   string
  billing_address_line2?:  string
  billing_city:            string
  billing_state:           string
  billing_pincode:         string
  same_as_billing?:        boolean
  installation_address_line1?: string
  installation_address_line2?: string
  installation_city?:          string
  installation_state?:         string
  installation_pincode?:       string
  enable_password_login?:    boolean
  enable_otp_login?:         boolean
  otp_login_message?:        string
  enable_volume_control?:    boolean
  portal_entry_mode?:        string
  registration_fields_config?: Record<string, unknown>
  branch_name?:              string
  branch_code?:              string
  manager_name?:             string
  manager_phone?:            string
  manager_email?:            string
  role_validity_days?:       Record<string, number>
  session_timeout?:         number
  idle_timeout?:            number
  max_concurrent_sessions?: number
  daily_data_limit_mb?:     number
  data_limit_mb?:           number
  time_limit_minutes?:      number
  throttle_bandwidth_up?:   number
  throttle_bandwidth_down?: number
  total_users?:             number
  registration_approval_mode?: string
}

export interface CustomerNetworkUpdate {
  captive_instance_id: number
  qinq_interface:      string
  wan_interface:       string
  svlan:               number
  cvlan?:              number
  start_ip:            string
  end_ip:              string
  qos_mode?:           string
  max_bandwidth?:      string
}

export interface CustomerUpdate {
  company_name?:    string
  primary_color?:   string
  secondary_color?: string
  welcome_message?: string
  terms_url?:       string
  contact_person?:  string
  contact_email?:   string
  contact_phone?:   string
  total_users?:     number
  daily_data_limit_mb?:        number
  registration_approval_mode?: string
  otp_login_message?:          string
  enable_volume_control?:      boolean
  portal_entry_mode?:          string
  customer_type?:              string
  registration_fields_config?: Record<string, unknown>
  branch_name?:                string
  branch_code?:                string
  manager_name?:               string
  manager_phone?:              string
  manager_email?:              string
  role_validity_days?:         Record<string, number>
  throttle_bandwidth_up?:      number
  throttle_bandwidth_down?:    number
  time_limit_minutes?:         number
  data_limit_mb?:              number
  session_timeout?:            number
  idle_timeout?:               number
  max_concurrent_sessions?:    number
}

export interface CustomerListResponse {
  total:     number
  customers: CustomerRead[]
}

// ── NOC ───────────────────────────────────────────────────────────────

export interface InstanceRead {
  id:          number
  name:        string
  host:        string
  ssh_port?:   number
  is_active?:  boolean
  created_at?: string
}

export interface HealthResponse {
  instance_id:   number
  name?:         string
  status:        string
  latency_ms?:   number
  wan_interface?: string
  ssh_connected?: boolean
  message?:      string
}

export interface OnboardResponse {
  customer_id:  number
  company_name: string
  slug:         string
  instance_id:  number
  message:      string
}

export interface DeBoardResponse {
  customer_id:  number
  company_name: string
  message:      string
}

export interface SessionRead {
  ip:                string
  timeout_remaining: number | null
}

export interface SessionListResponse {
  customer_slug: string
  session_count: number
  sessions:      SessionRead[]
}

export interface FlushSessionsResponse {
  message:       string
  flushed_count?: number
}

export interface BandwidthProfileRead {
  id:    number
  name:  string
  rate?: string
  ceil?: string
  [key: string]: unknown
}

export interface ProfilesListResponse {
  profiles: BandwidthProfileRead[]
  bandwidth_profiles?: BandwidthProfileRead[]
}

export interface QoSProvisionRequest {
  ip_address:           string
  bandwidth_profile_id: number
}

export interface QoSRemoveRequest {
  ip_address: string
  profile_id: number
}

export interface QoSStatsResponse {
  ip_address: string
  stats:      Record<string, unknown>
}

export interface TCStatusResponse {
  instance_id: number
  interface:   string
  status:      Record<string, unknown>
}

export interface ConntrackRecord {
  src_ip?:   string
  dst_ip?:   string
  src_port?: number
  dst_port?: number
  [key: string]: unknown
}

export interface ConntrackResponse {
  instance_id:      number
  customer_slug:    string
  connection_count: number
  connections:      ConntrackRecord[]
}

export interface NftablesStatusResponse {
  instance_id:   number
  customer_slug: string
  status?:       string
  details?:      Record<string, unknown>
  [key: string]: unknown
}

export interface UpstreamUserRead {
  username: string
  email?:   string
  phone?:   string
  [key: string]: unknown
}

// ── EB ────────────────────────────────────────────────────────────────

export interface EBDashboardStats {
  total:    number
  draft:    number
  ready:    number
  pushed:   number
  inactive: number
}

export interface MarkReadyResponse {
  customer_id:  number
  company_name: string
  status:       string
  message:      string
}

// ── API errors ────────────────────────────────────────────────────────

export interface APIError {
  detail?:  string
  error?:   string
  message?: string
  details?: Record<string, unknown>
  errors?:  { field: string; message: string }[]
}

// ── Pagination & Filtering ────────────────────────────────────────────

export interface PaginationParams {
  skip?:   number
  limit?:  number
  status?: string
  search?: string
}

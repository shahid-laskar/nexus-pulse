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

// ── VLAN Pools & Allocations ──────────────────────────────────────────

export interface CircleVlanPool {
  id:                number
  circle_id:         number
  svlan_range_start: number
  svlan_range_end:   number
  cvlan_range_start: number
  cvlan_range_end:   number
  created_at:        string
}

export interface CircleVlanPoolCreate {
  svlan_range_start: number
  svlan_range_end:   number
  cvlan_range_start: number
  cvlan_range_end:   number
}

export interface BASvlanAllocation {
  id:                number
  business_area_id:  number
  circle_id:         number
  svlan:             number
  cvlan_range_start: number
  cvlan_range_end:   number
  is_exhausted:      boolean
  notes:             string
  created_at:        string
}

export interface BASvlanAllocationCreate {
  svlan:             number
  cvlan_range_start: number
  cvlan_range_end:   number
  notes?:            string
}


// ── Customers ─────────────────────────────────────────────────────────

export type CustomerStatus = 'DRAFT' | 'READY' | 'NETWORK_CONFIGURED' | 'PUSHED' | 'ACTIVE' | 'INACTIVE'

export interface BandwidthProfileConfig {
  profile_name: 'bronze' | 'silver' | 'gold' | 'platinum'
  display_name: string
  rate_bandwidth_up: number      // kbps
  ceil_bandwidth_up: number      // kbps
  rate_bandwidth_down: number    // kbps
  ceil_bandwidth_down: number    // kbps
  pool_guaranteed_kbps?: number | null
  pool_ceiling_kbps?: number | null
  priority: number
  is_active: boolean
  is_lan_only: boolean
}

export interface CustomerRead {
  id:            number
  company_name:  string
  customer_type: string
  gstin:         string
  cin?:          string | null
  user_account?: string
  location?:     string
  circle_id?:    number
  business_area_id?: number
  status:        CustomerStatus
  is_active:     boolean
  is_pushed:     boolean
  can_be_pushed: boolean
  primary_color:   string
  secondary_color: string
  logo:            string | null
  banner_image_url?: string | null
  legal_doc_url?:    string | null
  welcome_message?: string | null
  terms_url?:       string | null
  portal_domain?:   string
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
  concurrent_users?: number
  subnet_cidr?:    string | null
  gateway_ip?:     string | null
  dhcp_range_start?: string | null
  dhcp_range_end?: string | null
  dhcp_lease_time?: number
  dhcp_subnet_id?: number | null
  dns_forward_enabled?: boolean
  network_configured_at?: string | null
  daily_data_limit_mb: number
  data_limit_mb?:         number | null
  time_limit_minutes?:    number | null
  session_timeout?:       number | null
  idle_timeout?:          number | null
  max_concurrent_sessions?: number | null
  registration_approval_mode: string
  approval_otp_validity_minutes?: number
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
  bandwidth_profiles?:   BandwidthProfileConfig[]
  mac_binding?:          boolean
  enable_mac_whitelist?: boolean
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
  user_account?:           string
  location?:               string
  circle_id?:              number
  business_area_id?:       number
  total_users?:            number
  concurrent_users?:       number
  dhcp_lease_time?:        number
  primary_color?:          string
  secondary_color?:        string
  welcome_message?:        string
  terms_url?:              string
  portal_domain?:          string
  banner_image_url?:       string | null
  legal_doc_url?:          string | null
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
  mac_binding?:              boolean
  enable_mac_whitelist?:     boolean
  approval_otp_validity_minutes?: number
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
  registration_approval_mode?: string
  max_bandwidth?:           string
  bandwidth_profiles?:      BandwidthProfileConfig[]
}

export interface CustomerNetworkUpdate {
  captive_instance_id: number
  qinq_interface:      string
  wan_interface:       string
  svlan:               number
  cvlan?:              number
  start_ip?:           string
  end_ip?:             string
  subnet_cidr?:        string | null
  gateway_ip?:         string | null
  dhcp_range_start?:   string | null
  dhcp_range_end?:     string | null
  dhcp_lease_time?:    number
  dhcp_subnet_id?:     number | null
  dns_forward_enabled?: boolean
  qos_mode?:           string
  max_bandwidth?:      string
}

export interface CustomerUpdate {
  company_name?:    string
  cin?:             string | null
  user_account?:    string
  location?:        string
  circle_id?:       number
  business_area_id?: number
  primary_color?:   string
  secondary_color?: string
  welcome_message?: string
  terms_url?:       string
  portal_domain?:   string
  banner_image_url?: string | null
  legal_doc_url?:   string | null
  contact_person?:  string
  contact_email?:   string
  contact_phone?:   string
  billing_address_line1?: string
  billing_address_line2?: string
  billing_city?:          string
  billing_state?:         string
  billing_pincode?:       string
  same_as_billing?:       boolean
  installation_address_line1?: string
  installation_address_line2?: string
  installation_city?:          string
  installation_state?:         string
  installation_pincode?:       string
  total_users?:     number
  concurrent_users?: number
  subnet_cidr?:        string | null
  gateway_ip?:         string | null
  dhcp_range_start?:   string | null
  dhcp_range_end?:     string | null
  dhcp_lease_time?:    number
  dhcp_subnet_id?:     number | null
  dns_forward_enabled?: boolean
  daily_data_limit_mb?:        number
  registration_approval_mode?: string
  approval_otp_validity_minutes?: number
  enable_password_login?:      boolean
  enable_otp_login?:           boolean
  mac_binding?:                boolean
  enable_mac_whitelist?:       boolean
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
  max_bandwidth?:              string
  bandwidth_profiles?:         BandwidthProfileConfig[]
}

export interface CustomerListResponse {
  total:     number
  customers: CustomerRead[]
}

// ── IP Calculator & Network Provisioning ──────────────────────────────

export interface IpCalculatorRequest {
  concurrent_users: number
  total_users?:     number
  buffer_pct?:      number
  base_ip?:         string
}

export interface IpCalculatorResponse {
  target_users:          number
  concurrent_users:      number
  total_users:           number
  buffer_pct:            number
  buffer_ips:            number
  required_ips:          number
  subnet_prefix_len:     number
  total_ips:             number
  usable_ips:            number
  client_assignable_ips: number
  efficiency_pct:        number
  subnet_cidr?:          string | null
  gateway_ip?:           string | null
  gateway_cidr?:         string | null
  dhcp_range_start?:     string | null
  dhcp_range_end?:       string | null
  broadcast_ip?:         string | null
}

export interface NetworkProvisionPayload {
  instance_id:         number
  interface:           string
  svlan:               number
  cvlan:               number
  wan_interface?:      string
  subnet_cidr:         string
  gateway_ip:          string
  dhcp_range_start:    string
  dhcp_range_end:      string
  dhcp_lease_time?:    number
  dhcp_subnet_id?:     number | null
  dns_forward_enabled?: boolean
  domain_forwards?:    Array<{ domain: string; nameserver: string }>
  qos_mode?:           string
  max_bandwidth?:      string
}

export interface NetworkProvisionResponse {
  customer_id:  number
  company_name: string
  status:       string
  instance_id:  number
  subnet_cidr:  string
  gateway_ip:   string
  dhcp_range:   string
  vyos_result:  Record<string, unknown>
  message:      string
}

export interface DhcpSetupPayload {
  shared_network_name: string
  subnet_cidr:         string
  gateway_ip:          string
  dhcp_start:          string
  dhcp_end:            string
  lease_time?:         number
  subnet_id?:          number | null
  dns_server?:         string | null
}

export interface DnsSetupPayload {
  listen_addresses: string[]
  allow_from_cidrs: string[]
  cache_size?:      number
  domain_forwards?: Array<{ domain: string; nameserver: string }>
}

export interface IpSubnetAllocation {
  id:           number
  pool_id:      number
  customer_id:  number | null
  subnet_cidr:  string
  is_released:  boolean
  notes:        string
  allocated_at: string
}

export interface IpSubnetPool {
  id:            number
  instance_id:   number
  supernet_cidr: string
  description:   string
  is_active:     boolean
  created_at:    string
  updated_at:    string
  allocations?:  IpSubnetAllocation[]
}

export interface IpSubnetPoolCreate {
  instance_id:   number
  supernet_cidr: string
  description?:  string
  is_active?:    boolean
}

// ── NOC ───────────────────────────────────────────────────────────────

export interface InstanceNetwork {
  vyos_ip?: string
  vyos_management_ip?: string
  wan_interface?: string
  svlan?: number
  cvlan_start?: number
  cvlan_end?: number
  wan_max_bandwidth?: string
}

export interface InstanceAuth {
  nas_identifier?: string
  api_endpoint?: string
  ssh_username?: string
  ssh_port?: number
  ssh_key_file?: string
  has_api_key?: boolean
  has_ssh_password?: boolean
  has_radius_secret?: boolean
  api_key?: string
  ssh_password?: string
  radius_secret?: string
}

export interface InstanceLocation {
  ba?: string
  circle?: string
}

export interface InstanceRead {
  id: number
  instance_id?: number
  identifier?: string
  name: string
  host?: string
  database_name?: string
  db_alias?: string
  db_configured?: boolean
  network?: InstanceNetwork
  auth?: InstanceAuth
  location?: InstanceLocation
  is_active?: boolean
  notes?: string
  created_at?: string
  updated_at?: string
  ssh_port?: number
}

export interface RouterTenantInfo {
  id: number
  company_name: string
  status: string
  interface: string
  svlan: number
  cvlan?: number | null
  subnet_cidr?: string | null
  gateway_ip?: string | null
  dhcp_range?: string | null
  max_bandwidth?: string
  qos_mode?: string
  slug?: string | null
  is_unmanaged?: boolean
}

export interface InstanceTopologyResponse {
  instance_id: number
  name?: string | null
  identifier?: string | null
  host?: string | null
  ssh_port: number
  wan_interface: string
  wan_max_bandwidth: string
  svlan: number
  cvlan_start: number
  cvlan_end: number
  allocated_cvlans: number[]
  next_available_cvlan?: number | null
  supernet_cidr: string
  allocated_subnets: string[]
  total_tenants: number
  total_committed_mbps: number
  available_interfaces: string[]
  tenants: RouterTenantInfo[]
  unmanaged_count?: number
}

export interface UnintegratedCustomer {
  instance_id: number
  name: string
  slug: string
  user_account?: string | null
  qinq_interface: string
  wan_interface: string
  svlan: number
  cvlan?: number | null
  start_ip?: string | null
  end_ip?: string | null
  suggested_subnet_cidr?: string | null
  suggested_gateway_ip?: string | null
  suggested_circle_id?: number | null
  suggested_circle_code?: string | null
  suggested_ba_id?: number | null
  suggested_ba_code?: string | null
  customer_type?: string
  is_active: boolean
  contact_person?: string | null
  contact_email?: string | null
  contact_phone?: string | null
}

export interface AdoptCustomerPayload {
  instance_id: number
  slug: string
  circle_id: number
  business_area_id: number
  company_name: string
  gstin?: string
  cin?: string
  contact_person: string
  contact_email: string
  contact_phone: string
  subnet_cidr?: string
  gateway_ip?: string
  dhcp_range_start?: string
  dhcp_range_end?: string
  max_bandwidth?: string
  qinq_interface?: string
  wan_interface?: string
  svlan?: number
  cvlan?: number
  customer_type?: string
}

export interface AdoptCustomerResponse {
  customer_id: number
  company_name: string
  slug: string
  instance_id: number
  status: string
  subnet_cidr: string
  gateway_ip: string
  cvlan?: number | null
  message: string
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
  username:    string
  full_name?:  string
  email?:      string
  phone?:      string
  status?:     string
  profile?:    string
  limits?: {
    session_timeout?:         number
    idle_timeout?:            number
    max_concurrent_sessions?: number
    data_limit_mb?:           number
    daily_data_limit_mb?:     number
  }
  usage?: {
    data_used_mb?: number
  }
  valid_from?:  string | null
  valid_until?: string | null
  created_at?:  string
  updated_at?:  string
  last_login?:  string | null
  [key: string]: unknown
}

export interface PendingRegistrationItem {
  id:                number
  phone:             string
  name?:             string | null
  registration_data: Record<string, unknown>
  status:            string
  submitted_at?:     string | null
  age_hours?:        number | null
  ip_address?:       string | null
  user_agent?:       string | null
  customer_id?:      number | null
  customer_name?:    string | null
  customer_slug?:    string | null
  [key: string]:     unknown
}

export interface PendingRegistrationsResponse {
  success:          boolean
  customer_id?:     number | null
  customer_name?:   string | null
  customer_slug?:   string | null
  count:            number
  pending_requests: PendingRegistrationItem[]
}

export interface FaultCheckResponse {
  customer_id: number
  captive_instance_id: number | null
  captive_customer_slug: string | null
  overall: 'healthy' | 'degraded' | 'down'
  checks: {
    db_status: { status: 'ok' | 'inactive' }
    nftables: { status: 'ok' | 'error' | 'unknown'; detail?: string | null }
    tc_qos: { status: 'ok' | 'no_qdisc' | 'error'; detail?: string | null }
    active_sessions: { count: number; note?: string; error?: string }
    auth_failures_24h: { count: number; error?: string | null }
  }
}

export interface InterfaceSetupRequest {
  interface: string
  svlan: number
  cvlan: number
  ip_cidr: string
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

// ── Router Proposals ──────────────────────────────────────────────────

export type RouterProposalStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'provisioned'

export interface RouterProposal {
  id: number
  identifier: string
  proposed_instance_id: number
  name: string
  ba_id: number
  circle_id: number
  svlan_allocation_id?: number | null
  vyos_ip: string
  vyos_management_ip: string
  nas_identifier: string
  wan_interface: string
  wan_max_bandwidth: string
  cvlan_start?: number | null
  cvlan_end?: number | null
  api_endpoint?: string | null
  ssh_username: string
  ssh_port: number
  has_api_key: boolean
  has_ssh_password: boolean
  status: RouterProposalStatus
  notes: string
  rejection_reason?: string | null
  noc_return_notes?: string | null
  proposed_by_id?: number | null
  proposed_at: string
  reviewed_by_id?: number | null
  reviewed_at?: string | null
  provisioned_at?: string | null
  captive_instance_id?: number | null
}

export interface RouterProposalCreate {
  identifier: string
  proposed_instance_id: number
  name: string
  ba_id: number
  circle_id: number
  svlan_allocation_id?: number | null
  vyos_ip: string
  vyos_management_ip: string
  nas_identifier: string
  wan_interface?: string
  wan_max_bandwidth?: string
  cvlan_start?: number | null
  cvlan_end?: number | null
  api_endpoint?: string | null
  api_key?: string | null
  ssh_username?: string
  ssh_password?: string | null
  ssh_port?: number
  notes?: string
}

export interface RouterProposalUpdate {
  identifier?: string
  name?: string
  proposed_instance_id?: number
  ba_id?: number
  circle_id?: number
  svlan_allocation_id?: number | null
  vyos_ip?: string
  vyos_management_ip?: string
  nas_identifier?: string
  wan_interface?: string
  wan_max_bandwidth?: string
  cvlan_start?: number | null
  cvlan_end?: number | null
  api_endpoint?: string | null
  api_key?: string | null
  ssh_username?: string
  ssh_password?: string | null
  ssh_port?: number
  notes?: string
}

export interface RouterProposalApprove {
  captive_db_dsn?: string
  nat_db_dsn?: string
  name?: string
  proposed_instance_id?: number
  identifier?: string
}

export interface RouterProposalReject {
  rejection_reason: string
}

export interface RouterProposalReturn {
  noc_return_notes: string
}

// ── Change Requests ────────────────────────────────────────────────────

export type ChangeRequestType =
  | 'PORTAL_SETTINGS'
  | 'SESSION_POLICY'
  | 'BANDWIDTH_PROFILE'
  | 'AUTH_OPTIONS'
  | 'QOS'

export type ChangeRequestStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'NEEDS_INFO'
  | 'APPROVED_APPLYING'
  | 'APPLIED'
  | 'REJECTED'

export interface ChangeRequest {
  id: number
  customer_id: number
  request_type: ChangeRequestType
  payload: Record<string, any>
  status: ChangeRequestStatus
  eb_notes: string
  noc_notes?: string | null
  requested_by_id?: number | null
  requested_at: string
  reviewed_by_id?: number | null
  reviewed_at?: string | null
  applied_by_id?: number | null
  applied_at?: string | null
}

export interface ChangeRequestCreate {
  customer_id: number
  request_type: ChangeRequestType
  payload: Record<string, any>
  eb_notes?: string
}

export interface ChangeRequestReview {
  noc_notes: string
}

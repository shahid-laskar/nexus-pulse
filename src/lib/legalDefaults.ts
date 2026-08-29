/**
 * Canonical legal compliance documents (DOT/TRAI standards).
 * Matches the captive portal's default legal templates.
 */

export interface LegalDocTemplate {
  doc_type: 'tos' | 'privacy' | 'fup'
  title: string
  body_html: string
  effective_date: string
  requires_reacceptance: boolean
}

export const DEFAULT_TOS_HTML = `<h4>1. ACCEPTANCE OF TERMS</h4>
<p>By accessing and using this WiFi service, you agree to be bound by these Terms of Service. If you do not agree, do not use this service.</p>

<h4>2. AUTHORIZED USE</h4>
<p>This service is provided for lawful purposes only. You shall not use this service to:</p>
<ul>
    <li>Access, transmit, or store any illegal, harmful, or objectionable content</li>
    <li>Attempt to gain unauthorized access to any network, system, or data</li>
    <li>Interfere with or disrupt network services or equipment</li>
    <li>Violate any applicable local, state, national, or international laws</li>
</ul>

<h4>3. MONITORING &amp; LOGGING</h4>
<p>In compliance with Department of Telecommunications (DOT) and TRAI regulations, all internet sessions are monitored and IP detail records are maintained.</p>

<h4>4. USER IDENTITY VERIFICATION</h4>
<p>As per DOT guidelines, user identity verification through OTP or registered credentials is mandatory before granting network access.</p>

<h4>5. LIABILITY</h4>
<p>The service provider shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of this service.</p>`

export const DEFAULT_PRIVACY_HTML = `<h4>1. DATA COLLECTION</h4>
<p>We collect mobile number, name and registration details, device identifiers, IP address, and session metadata required for service delivery and compliance.</p>

<h4>2. PURPOSE OF DATA COLLECTION</h4>
<ul>
    <li>User authentication and network access management</li>
    <li>Compliance with DOT/TRAI regulatory requirements</li>
    <li>Network security monitoring and incident response</li>
    <li>Service improvement and capacity planning</li>
</ul>

<h4>3. DATA RETENTION</h4>
<ul>
    <li>Regulatory logs are retained as required by applicable rules</li>
    <li>User registration data is retained for the duration of the account</li>
    <li>Session logs are retained according to compliance policy</li>
</ul>

<h4>4. DATA SHARING</h4>
<p>Your data may be shared with regulators or law enforcement when required by law. It is not sold for marketing purposes.</p>`

export const DEFAULT_FUP_HTML = `<h4>1. FAIR USAGE POLICY</h4>
<p>This WiFi service operates under a Fair Usage Policy to ensure equitable access for all users.</p>

<h4>2. BANDWIDTH ALLOCATION</h4>
<ul>
    <li>Each user is allocated a fair share of available bandwidth</li>
    <li>During peak hours, bandwidth may be managed to maintain service quality</li>
    <li>Excessive usage may result in temporary speed reduction</li>
</ul>

<h4>3. PROHIBITED ACTIVITIES</h4>
<ul>
    <li>Peer-to-peer sharing of copyrighted material</li>
    <li>Running servers or proxies on the network</li>
    <li>Activities that degrade service for other users</li>
    <li>Bypassing network security controls</li>
</ul>`

export const DEFAULT_LEGAL_TEMPLATES: Record<'tos' | 'privacy' | 'fup', LegalDocTemplate> = {
  tos: {
    doc_type: 'tos',
    title: 'Terms of Service',
    body_html: DEFAULT_TOS_HTML,
    effective_date: new Date().toISOString().split('T')[0],
    requires_reacceptance: false,
  },
  privacy: {
    doc_type: 'privacy',
    title: 'Privacy Policy',
    body_html: DEFAULT_PRIVACY_HTML,
    effective_date: new Date().toISOString().split('T')[0],
    requires_reacceptance: false,
  },
  fup: {
    doc_type: 'fup',
    title: 'Fair Usage Policy',
    body_html: DEFAULT_FUP_HTML,
    effective_date: new Date().toISOString().split('T')[0],
    requires_reacceptance: false,
  },
}

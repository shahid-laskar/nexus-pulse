# NOC Portal: Fault Monitoring & Observability Implementation Plan

## 1. Current State & Research Findings
Currently, the NOC Portal (`bsnl-admin-frontend` + `bsnl-backend` + `captive-portal`) offers robust provisioning and operational capabilities but lacks deep observability:
- **Available Features:** VyOS Router provisioning (Onboard/Deboard), Session flushing, IP-based QoS provisioning, Connection tracking visibility, and basic health checks (SSH connectivity/latency).
- **Missing Features (Faults):** No hardware monitoring (CPU, RAM, Interface traffic), no visibility into NAT port exhaustion, no Radius authentication failure logs, and no proactive alerting mechanism for link failures or high error rates.

## 2. Core Fault Scenarios to Monitor
To bring the NOC portal up to enterprise standards, we must monitor and alert on:
1. **Hardware & Infrastructure:** VyOS CPU > 90%, RAM exhaustion, Disk space issues.
2. **Network & Interfaces:** WAN/LAN interface flaps (Link Up/Down), abnormal traffic drops, or RX/TX errors.
3. **Authentication (Radius):** Spike in `Access-Reject` events (e.g., users failing auth due to wrong passwords or concurrent limits).
4. **NAT Exhaustion:** Failures in `ulogd` logging or exhaustion of available NAT ports for a customer subnet.
5. **Database / FDW Sync:** Failures in the Foreign Data Wrapper syncing NAT logs to the central database.

## 3. Proposed Architecture
The implementation will heavily leverage our existing centralized architecture without bloating the VyOS routers.

### 3.1 Data Collection Layer
- **Metrics (Prometheus & Telegraf):** Deploy `Telegraf` on VyOS instances (using VyOS's native container support or SNMP polling) to collect system metrics (CPU, Memory, Interface throughput). Prometheus will scrape these metrics centrally.
- **Logs (Promtail & Loki):** Stream VyOS syslogs (for interface flaps) and FreeRADIUS `radpostauth` logs (for auth rejections) into a central log aggregator like Grafana Loki.

### 3.2 Alerting Engine
- **Alertmanager:** Configure Prometheus Alertmanager with threshold rules (e.g., `VyosCpuHigh`, `InterfaceFlapping`).
- **Webhook Integration:** Alertmanager will fire webhooks directly into our `bsnl-backend` to persist these alerts in our PostgreSQL database.

---

## 4. Backend Implementation Plan (`bsnl-backend`)

### 4.1 New Database Models
Create a new `NocAlert` model to store historical and active faults:
```python
class NocAlert(Base):
    id = Column(Integer, primary_key=True)
    instance_id = Column(Integer, index=True) # Which VyOS router
    severity = Column(String) # CRITICAL, MAJOR, MINOR
    title = Column(String)
    message = Column(Text)
    status = Column(String, default="ACTIVE") # ACTIVE, RESOLVED, ACKNOWLEDGED
    created_at = Column(DateTime)
    resolved_at = Column(DateTime, nullable=True)
```

### 4.2 New API Endpoints
- **`POST /noc/alerts/webhook/`**: Internal ingress endpoint for Prometheus Alertmanager.
- **`GET /noc/alerts/`**: List active/historical alerts for the React frontend.
- **`PUT /noc/alerts/{id}/ack/`**: Acknowledge an alert.
- **`GET /noc/metrics/{instance_id}/`**: Proxy endpoint that queries Prometheus for the last 24h of CPU/Traffic data to render graphs in the UI.
- **`GET /noc/auth-failures/`**: Proxy to the captive portal to fetch recent Radius `radpostauth` rejection reasons.

---

## 5. Frontend Implementation Plan (`bsnl-admin-frontend`)

### 5.1 New "Alarms & Faults" View
Create a dedicated `NocAlarmsPage.tsx`:
- A live data table displaying active alerts.
- Severity badges (Red for Critical, Orange for Major).
- Action buttons for NOC admins to "Acknowledge" or "Resolve" alerts.
- Filter toggles to view historical/resolved faults.

### 5.2 Enhanced NOC Dashboard (`NOCDashboardPage.tsx`)
- Embed **Time-series Charts** (using `Recharts` or `Chart.js`) inside the `InstanceHealthCard` to show a miniature 2h sparkline of CPU and Traffic throughput.
- Add an "Active Critical Alarms" summary banner at the top of the dashboard.

### 5.3 Diagnostic Enhancements in `SessionsPage.tsx`
- Add a new tab: **"Auth Rejections"**. This will pull from the new auth-failures API, allowing NOC engineers to see *why* a customer's user cannot connect (e.g., "Max concurrent sessions reached", "Invalid Password").

---

## 6. Rollout Phases

**Phase 1: Basic Observability & Alerts (Weeks 1-2)**
- Setup Prometheus & Alertmanager in the management VPC.
- Configure SNMP/Telegraf on VyOS routers.
- Implement the Webhook ingress and `NocAlert` DB models in `bsnl-backend`.
- Build the basic `NocAlarmsPage.tsx` in React.

**Phase 2: Authentication & Log Diagnostics (Week 3)**
- Expose Radius `radpostauth` logs via the Captive Portal API.
- Wire this up to the `bsnl-backend` and display it in the NOC Sessions page.

**Phase 3: Visual Dashboards & Metrics (Week 4)**
- Build the Prometheus proxy endpoint in `bsnl-backend`.
- Add React traffic/CPU graphs to the NOC Dashboard.

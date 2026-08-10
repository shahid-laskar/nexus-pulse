# NOC Admin Portal API Documentation

This API enables Network Operations Center (NOC) administrators to provision customers onto VyOS routers, manage bandwidth limits (Traffic Control/QoS), inspect active sessions, manage connection tracking (conntrack), and monitor router health.

**Base URL**: `https://<BACKEND_HOST>/api/v1/noc`

**Authentication**: 
- **Method**: Bearer Token / JWT
- **Role Requirement**: Must have the `BA_NOC_ADMIN` or `SUPER_ADMIN` role.

---

## 1. Health & Infrastructure

### 1.1 Check Router Health
- **Method**: `GET`
- **Path**: `/health/{instance_id}/`
- **Description**: Returns basic health, uptime, and load statistics for the specified VyOS router instance.

### 1.2 List Available Router Instances
- **Method**: `GET`
- **Path**: `/instances/`
- **Description**: Retrieves a list of available VyOS router instances that can host customers.

---

## 2. Customer Provisioning (Onboard / Deboard)

### 2.1 Onboard Customer
- **Method**: `POST`
- **Path**: `/customers/{customer_id}/onboard/`
- **Description**: Provisions a customer on the VyOS router. This creates the customer in the remote captive database, initializes nftables isolation rules, and applies root Traffic Control (TC) queuing.
- **Response**: `OnboardResponse` containing `customer_id`, `company_name`, `slug`, and `instance_id`.

### 2.2 Deboard Customer
- **Method**: `POST`
- **Path**: `/customers/{customer_id}/deboard/`
- **Description**: Deprovisions a customer from the VyOS router. This safely flushes all active customer sessions, clears connection tracking (conntrack) entries, tears down nftables rules, and finally deletes the customer from the captive portal.

---

## 3. Session & Connection Management

### 3.1 List Active Sessions
- **Method**: `GET`
- **Path**: `/customers/{customer_id}/sessions/`
- **Description**: Lists all currently active network sessions on the router for the specific customer.

### 3.2 Flush ALL Sessions
- **Method**: `DELETE`
- **Path**: `/customers/{customer_id}/sessions/`
- **Description**: Immediately terminates all active sessions for the customer across the router (destructive operation).

### 3.3 Disconnect Single Session
- **Method**: `DELETE`
- **Path**: `/customers/{customer_id}/sessions/{ip}/`
- **Description**: Disconnects a specific active session based on its assigned IP address.

### 3.4 List Conntrack Entries
- **Method**: `GET`
- **Path**: `/customers/{customer_id}/conntrack/`
- **Description**: Inspects active Netfilter connection tracking entries for troubleshooting.

### 3.5 Flush Conntrack
- **Method**: `DELETE`
- **Path**: `/customers/{customer_id}/conntrack/`
- **Description**: Flushes conntrack state for the customer.

---

## 4. Quality of Service (QoS) & Bandwidth Shaping (TC)

### 4.1 Provision QoS for an IP
- **Method**: `POST`
- **Path**: `/customers/{customer_id}/qos/`
- **Body**: 
  - `ip_address` (string, required)
  - `bandwidth_profile_id` (int, required)
- **Description**: Attaches a specific bandwidth profile/class to an active IP address.

### 4.2 Remove QoS for an IP
- **Method**: `DELETE`
- **Path**: `/customers/{customer_id}/qos/`
- **Body**: 
  - `ip_address` (string, required)
  - `profile_id` (int, required)

### 4.3 Get QoS Stats
- **Method**: `GET`
- **Path**: `/customers/{customer_id}/qos/{ip}/stats/`
- **Query Params**:
  - `profile_id` (int, required)
- **Description**: Returns live byte/packet transfer statistics for the applied QoS class.

### 4.4 Get TC Status
- **Method**: `GET`
- **Path**: `/customers/{customer_id}/tc/`
- **Description**: Returns the Traffic Control (HTB/FQ_CODEL) tree configuration applied to the customer's interface.

### 4.5 Update TC Max Bandwidth
- **Method**: `PUT`
- **Path**: `/customers/{customer_id}/tc/max-bandwidth/`
- **Query Params**:
  - `max_bandwidth` (string, required): Format e.g., "1gbit", "500mbit".
- **Description**: Dynamically alters the root ceiling bandwidth limit for the customer.

### 4.6 List Available Bandwidth Profiles
- **Method**: `GET`
- **Path**: `/customers/{customer_id}/profiles/`
- **Description**: Retrieves bandwidth tier profiles mapped to this customer.

---

## 5. Security (nftables)

### 5.1 Check nftables Status
- **Method**: `GET`
- **Path**: `/customers/{customer_id}/status/`
- **Description**: Validates that nftables zones, forward chains, and NAT rules are properly deployed and isolated.

---

## 6. Upstream Customer & Admin Sync

### 6.1 Get Upstream Customer Details
- **Method**: `GET`
- **Path**: `/customers/{customer_id}/upstream/`
- **Description**: Fetch the customer's state from the upstream remote portal.

### 6.2 Update Upstream Customer
- **Method**: `PUT`
- **Path**: `/customers/{customer_id}/upstream/`
- **Body**: JSON dict containing updated fields to sync to the remote portal.

### 6.3 List Upstream Users
- **Method**: `GET`
- **Path**: `/customers/{customer_id}/users/`

### 6.4 Create Upstream User
- **Method**: `POST`
- **Path**: `/customers/{customer_id}/users/`

### 6.5 Update Upstream User
- **Method**: `PUT`
- **Path**: `/customers/{customer_id}/users/{username}/`

### 6.6 Delete Upstream User
- **Method**: `DELETE`
- **Path**: `/customers/{customer_id}/users/{username}/`

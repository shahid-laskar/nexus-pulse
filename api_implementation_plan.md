 # BSNL Admin Frontend API Completion Plan

  ## Summary

  Audit results show that bsnl-admin-frontend supports the basic authentication, user, master-data, EB, and NOC workflows, but several implemented backend APIs have no UI, several routes are unreachable, and the frontend types/API clients do not fully represent backend
  responses.

  Scope: complete admin-facing APIs only. Customer captive-portal APIs such as WiFi-user management, branding, legal documents, and banners remain owned by the separate customer frontend.

  ## Implementation Changes

  ### 1. Establish a complete typed API contract

  - Update src/types/index.ts with exact backend response types for:
      - authentication and password changes;
      - paginated users/customers;
      - circles and business areas;
      - customer network configuration;
      - EB dashboard and customer responses;
      - NOC health, instances, onboarding, deboarding, sessions, TC, QoS, conntrack, nftables status, and bandwidth updates.

  - Replace Record<string, any> with unknown or explicit JSON types.
  - Extend APIError to support detail, error, message, details, and field-level validation errors.
  - Normalize API response handling in one shared client utility.
  - Preserve JWT refresh behavior while preventing duplicate refresh requests and ensuring failed requests are retried exactly once.
  - Standardize trailing slashes and URL construction across all API modules.

  ### 2. Complete API modules

  Update the API modules so every admin backend route has a typed client method.

  - authApi
      - login, logout, refresh handling, current-user lookup, password change.

  - usersApi
      - list with pagination and filters;
      - get, create, update, deactivate;
      - role/scope metadata if exposed by the backend.

  - circlesApi and businessAreasApi
      - list, create, update;
      - support active/inactive state updates.
      - mark READY;

  - customersApi
      - get, create, update, deactivate;
      - update network configuration.


  - ebApi
      - dashboard;
      - list, get, create, update, mark READY, deactivate.

  - nocApi
      - instance listing and health;
      - customer onboarding and deboarding;
      - session listing, flushing, and individual disconnect;
      - TC status and maximum-bandwidth updates;
      - QoS provision, removal, and statistics;
      - customer profiles;
      - conntrack listing/flushing;
      - nftables/customer status.


  - Keep all captive-portal credentials server-side; the frontend must call the FastAPI backend only.


  Where the backend has client/service support but no public admin route yet—particularly upstream customer/user/profile operations—add the corresponding backend admin routes before wiring the frontend. Do not call /noc-api or /cust-api directly from the browser.


  ### 3. Complete routing and screens

  - Add the missing EB customer detail route:
      - /eb/customers/:id.

  - Add customer edit access for existing, non-pushed customers.
  - Add circle and business-area edit workflows.
  - Add user profile/settings UI for current-user details and password changes.
  - Add NOC instance/health visibility and instance selection where needed.
  - Expand the NOC dashboard with:
      - health status;
      - instance information;
      - READY/PUSHED queues;
      - deboarding actions;
      - operational status indicators.

  - Expand onboarding to display and edit all network/TC fields, validation errors, and provisioning progress.
  - Expand sessions to:
      - show normalized session fields;

      - load available bandwidth profiles instead of requiring a manually entered profile ID;

      - provision/remove QoS;
      - display QoS statistics in a structured panel;

      - flush sessions and conntrack separately;

      - display nftables and TC status.

  - Add explicit confirmation dialogs for destructive operations rather than browser confirm() calls.

  ### 4. Improve query, mutation, and UX behavior

  - Add React Query keys that include filters, pagination, customer IDs, and instance IDs.
  - Invalidate related queries after create/update/deactivate/READY/onboard/deboard operations.
  - Add consistent loading, error, empty, retry, and disabled states to every page.
  - Add pagination instead of requesting 200 records unconditionally.
  - Add status filters and search where backend query parameters support them.
  - Prevent actions that are invalid for the current status or role.
  - Replace inline any casts and unsafe form coercions with typed schemas.
  - Ensure forms load complete existing customer data when editing; do not silently blank required address fields.
  - Fix inconsistent route links between /customers, /eb/customers, and NOC customer pages.
  - Add accessible labels, keyboard-safe dialogs, and clear success/error notifications.

  ## Test Plan

  Add frontend unit and integration coverage using Vitest, React Testing Library, and MSW.

  ### API contract tests

  Verify:

  - every API method uses the correct HTTP method, path, query parameters, and request body;
  - NOC QoS removal uses the expected profile query/body contract;
  - pagination and filters are serialized correctly;
  - nested backend responses are mapped to frontend types;
  - detail, error, message, details, and validation errors render correctly;
  - token refresh retries one request and logs out after refresh failure.


  ### Component/workflow tests


  Cover:


  - admin login and role-based redirects;

  - protected routes and unauthorized access;
  - user creation, editing, and deactivation;

  - circle/business-area CRUD;
  - customer creation, editing, READY transition, and network update;
  - EB customer create/edit/detail/READY flows;
  - NOC health, onboarding, deboarding, sessions, QoS, TC, conntrack, and status workflows;
  - destructive-action confirmation and mutation failure handling;
  - empty, loading, retry, and pagination states.

  ### Verification commands

  Run:

  npm run lint
  npx tsc --noEmit
  npm run build
  npm run test

  Perform authenticated browser checks for each role:

  - SUPER_ADMIN;
  - CIRCLE_ADMIN;
  - BA_ADMIN;
  - BA_NOC_ADMIN;
  - BA_EB_ADMIN.

  ## Assumptions

  - The FastAPI backend remains the only browser-facing API boundary.
  - Customer captive-portal management is excluded from the admin UI.
  - Existing backend authorization rules remain authoritative.
  - No frontend database or migration changes are required.
  - API route additions needed to expose already-supported NOC adapter operations should be implemented in the backend as a prerequisite.
  - Pagination should be enabled wherever the backend supports skip, limit, and status.


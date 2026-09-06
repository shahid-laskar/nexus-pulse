# Rebuild the commercial admin suite

## Goal
Create cohesive, production-grade admin screens for hotspots, vouchers, plans, portal branding, AAA/RADIUS, resellers, billing, and reports. All screens will use the existing Pulse shell, semantic color tokens, compact controls, and shared UI components.

## What will be built
- **Hotspots & APs:** fleet health, online/offline counts, utilization, search and status filters, and a detailed inventory table.
- **Vouchers & Codes:** inventory metrics, batch/status filtering, voucher lifecycle table, and issuance actions.
- **Plans & Tariffs:** plan comparison cards, subscriber/revenue context, and plan management actions.
- **Portal Studio:** selectable portal profiles, live mobile preview, branding controls, and publish state.
- **AAA / RADIUS:** authentication health, NAS clients, accounting status, and recent request visibility.
- **Resellers & Tenants:** tenant commercial health, customer/site footprint, credit exposure, and management actions.
- **Billing & Invoices:** revenue/collection summaries, invoice states, aging visibility, and invoice actions.
- **Reports:** operational report library, scheduled deliveries, exports, and recent run history.

## Shared experience
- Add a small shared admin-page toolkit for KPI strips, filter bars, status labels, and empty/loading-safe tables.
- Use deterministic sample data only where no current API exists; no existing API, query, schema, or store contract will be changed.
- Wire all eight existing navigation paths into the router while retaining every current route.
- Ensure desktop and compact viewport layouts remain readable, with dark/light token support and accessible controls.

## Validation
- Check the production build and focused tests.
- Open each new route in the running preview and verify layout, interactions, and console health.

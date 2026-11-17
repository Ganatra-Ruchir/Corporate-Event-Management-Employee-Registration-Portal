# Elixir Events V3 — CSR and social impact

## Implemented in this draft
- Additive PostgreSQL tables for company-country units, states, branches, memberships and verified event contributions. Existing accounts and RSVPs are unchanged.
- Root creates country units and assigns an existing approved company administrator; existing root invitation flow creates the initial company account/admin.
- Country administrators create states, branches, state administrators and employees. State administrators create employees only in their assigned state and branches.
- V3 state administrators currently use the legacy employee account role plus a scoped state_admin membership; they have no legacy company-admin rights.
- New accounts receive a generated employee ID, approved-domain email and hashed 24-hour temporary password. Login accepts email or V3 employee ID, and the existing forced first-login password change applies.
- Employee dashboard lists upcoming company events, active registrations, verified attendance, volunteer hours and contribution notes. Registration does not imply attendance.
- Authorized V3 admins can verify completed-event registrations in their membership scope.
- Permission unit tests included (run npm test).

## Required staging setup
1. Use an isolated Neon staging branch, never the live database.
2. Apply numbered migrations using the existing guarded migration script.
3. Set PORTAL_V3_ENABLED=true in staging only, and use database backend mode.
4. Create a country, assign the company admin, create state and branch, then provision employees.
5. Test first login, expiration/reset, cross-country/state denial, attendance and personal dashboard; test mobile and desktop.

## Release blockers
- Legacy event API, registration, notifications, signup, employee administration and snapshot still use company-wide permissions. Country admin's existing V2 company-admin rights are not yet narrowed; state admin's legacy discovery is company-wide. Do not enable production V3 until all endpoints enforce the new hierarchy and event audience.
- Backfill and review existing account assignments; enforce role changes, reassignment, deactivation and temporary credential session expiry, recovery and audit controls end-to-end.
- Test migrations, transaction behavior, authentication, cross-tenant and cross-state access, build, and UI in staging.
- No production migration or release as part of this draft.

## Next implementation stages
1. Event audience model: global, country, company, state, branch, invited; event creation permissions, invitations and RSVP enforcement.
2. Attendance workflow: QR check-in/out, manual and bulk verification; contribution evidence, approvals, certificates, feedback.
3. CSR campaign and NGO partnership management: projects, partner onboarding, document verification, targets, budgets, calendar and per-company/state/branch analytics.
4. Impact records and reporting: outcomes, beneficiaries with deduplication, SDG/ESG mappings, reports and audit exports.
5. Communications: announcements, opt-in email/WhatsApp, reminders, provider integration and delivery tracking.
6. AI and knowledge hub: permission-scoped retrieval, recommendations, planning, draft reports/proposals/invitations, human approvals and content/data protection. Verify exact CauseConnect AI public feature coverage and provider requirements before declaring parity.
7. Responsive redesign, complete security review, automated integration test suite, migration rehearsal, release and rollback runbook.

The above stages are planned, not implemented. The scope is based on the agreed V3 requirements, not a claim of exact parity with a third-party private dashboard.

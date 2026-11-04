# Neon PostgreSQL: Staging deployment and verification

## Verified infrastructure (4 November 2026)

- Neon project: \`elixir-events\`, AWS Singapore, PostgreSQL 18
- Permanent branch \`production\`: **untouched application schema**
- Permanent branch \`staging\`: application tables and private \`event-media\` bucket created
- Vercel-managed branch \`preview/feature/neon-postgres-backend\`: matching application tables, admin setup table, private media bucket
- Vercel Preview branch variables: \`DATABASE_URL\`, \`DATABASE_URL_UNPOOLED\`, \`PORTAL_BACKEND_MODE=database\`, branch-scoped S3 storage credentials
- Live \`/api/portal/health\` response: \`{"mode":"postgresql","ready":true}\`
- Live \`/api/portal/media-health\` response: \`{"storage":"neon-private","ready":true}\`
- GitHub CI: typecheck, lint, unit tests and Next.js build passed

No database schema migration has been applied to production, and the Vercel Production environment has no database feature flag.

## First Platform Admin

A one-time administrator activation link has been sent to the owner's connected Elixir Foundation work email. Its SHA-256 digest is recorded in \`admin_setup_tokens\` in the **preview** database, and it expires after 24 hours. The recipient must open the email and choose a password of at least 14 characters. The activation endpoint verifies the email allowlist, token expiry, lack of an existing admin, and one-time use under a transaction lock.

Do not copy activation URLs into issues, commit logs, public screenshots or production environment variables.

Once the administrator finishes the activation, the app can be tested end-to-end. Only administrators may approve other staging users. **Manual approval is not a substitute for email ownership verification for live production users.**

An alternative guarded command-line bootstrap exists for isolated testing: \`npm run db:bootstrap-admin\`, requiring a secure staging direct connection and \`ALLOW_STAGING_BOOTSTRAP=true\`. Do not run it after the first admin has been activated.

## Reproducible migrations

The migrations are tracked in source:

- \`db/migrations/001_init.sql\`: organizations, domains, accounts, sessions, invitations, events, registrations and audit logs
- \`db/migrations/002_admin_setup.sql\`: expiring one-time first-admin activation links

From a secure terminal, with a **staging direct** PostgreSQL connection in \`DATABASE_URL_UNPOOLED\`:

\`\`\`sh
npm install
ALLOW_STAGING_MIGRATIONS=true npm run db:migrate
\`\`\`

This command refuses Vercel production execution. Both current staging branches have already been migrated, so rerunning is not necessary.

## Role acceptance tests after activation

1. Platform Admin signs in and creates a partner organization with its approved work-email domain.
2. Company manager registers, is approved, and is explicitly granted admin access through a matching invitation.
3. Employee signs in on another device and sees only the published events in their organization.
4. Company Admin publishes a complete event, including banner and speaker photos.
5. Multiple employees register for limited capacity. Registrations do not exceed the event capacity.
6. Cancelling an RSVP moves the earliest waitlisted registration to Going.
7. Company Admin raises capacity, automatically promoting waiting attendees.
8. Employee profile changes and sign-out persist securely across browser reloads.
9. Platform Admin can suspend a company or account and server-side access is immediately denied.

## Before real production rollout

- Add verified work-email ownership via managed Auth or equivalent and implement password reset.
- Connect a transactional email provider for RSVP confirmations, reminders and cancellation notices.
- Complete cross-browser/mobile, role-isolation and concurrent-RSVP integration tests with actual test users.
- Configure storage retention, backups, monitoring, data export and deletion policies.
- Migrate production only after explicit approval and staging acceptance.

This document records verifiable staging infrastructure; it does not imply that real-user production readiness is complete.


## Employee signup with free email OTP (staging)

The database preview now includes \`/signup\`. Company admins can open **People → Copy employee signup link** and share it with staff. Every employee:
1. Enters their full name, department and approved company-domain email address.
2. Creates a password and requests a time-limited email code.
3. Enters the OTP received from Neon Auth.
4. Waits for their company's admin to approve the account on the **People** page.
5. Signs in and sees only their company's events.

The API does **not** trust a client-side "verified" flag. \`/api/portal/register\` requires a valid Neon Auth session with \`user.emailVerified === true\`; it then creates an unapproved employee record. The old unverified signup endpoint is disabled.

**One mandatory Neon Console setting before this can be tested:**
Go to the \`preview/feature/neon-postgres-backend\` branch → **Auth → Configuration → Email**. Turn on **Verify at Sign-up**, select **Verification code (OTP)**, and require email verification. In the latest inspection, \`verify_email_on_sign_up\` and \`require_email_verification\` were still off. Neon’s exposed app connection does not currently provide an operation to change these toggles.

Neon's shared development SMTP can deliver testing codes without another mail-provider account. This shared sender is **not recommended for production**. A zero-cost option for low-volume production is Resend's Free plan (currently 3,000 emails/month, 100/day); it requires domain ownership verification and configuring custom SMTP in Neon. Do not put SMTP passwords into the frontend or GitHub. Verify a real company-owned sender domain before inviting live employees.

**Additional admin accounts:** Only the already-activated initial Platform Admin exists by default. To grant company-admin access, use a verified employee account and a matching invitation; never automatically promote arbitrary email input. Any further desired Elixir admin email addresses must be supplied explicitly before granting access.


## Admin-created employees (updated)

A logged-in Company Admin can open **People → Add employee**, enter a name, department and work email on an approved domain for that same active organization, then generate an employee ID and a temporary password.

- **No email OTP** is required for this administrator-provisioned path. The already-authenticated Company Admin is responsible for verifying who receives the credentials.
- The employee signs in using **work email + generated temporary password**, then **must choose a new password** on the first login before any events or other organization data are shown.
- The server prevents reuse of the temporary password; changing it invalidates other outstanding sessions. The temporary password is never sent via email or logged. Share it privately, not in a group chat.
- Employees who choose **self-signup** at `/signup` still need email OTP and automatic domain matching.
- The same-company rule and employee-only role are enforced server-side; employee creation does not grant admin privileges.
- One legacy staging employee created via an audited `employee.provisioned` action was migrated to the new forced-password-change policy; self-signups and production were not affected.

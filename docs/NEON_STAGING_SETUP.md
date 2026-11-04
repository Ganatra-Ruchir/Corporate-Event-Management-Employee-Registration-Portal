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

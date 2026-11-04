# Elixir Events Portal

Next.js event management for Elixir Foundation and its partner organizations, with distinct interfaces for **Platform Admin**, **Organization Admin**, and **Employee**.

## Environments

| Environment | Storage | Status |
| --- | --- | --- |
| [Production](https://emplatfors.vercel.app/) (\`main\`) | Legacy browser-local demo | No production database migration |
| \`feature/neon-postgres-backend\` on Vercel Preview | Neon PostgreSQL + private Neon Object Storage | Staging backend and health checks operational |

The legacy demo still supports fictional companies and demo credentials. **Never use real credentials or employee data in demo mode.** The database-enabled preview has its own administrator setup flow and is not seeded with fictional accounts.

## Staging PostgreSQL integration

- Server-only PostgreSQL queries, password hashes (scrypt), HTTP-only cookies and revocable sessions
- Organization isolation and privileged actions enforced in Next.js API handlers
- Organization and employee account management, approvals, role invitations, event management
- Atomic registrations, waitlisting, cancellations and promotion when places become available
- Private banner and speaker-image uploads to branch-isolated Neon Object Storage, delivered with short-lived signed URLs
- Non-production migrations: \`db/migrations/001_init.sql\` and \`002_admin_setup.sql\`
- Read-only health endpoints: \`/api/portal/health\` and \`/api/portal/media-health\`

**Database mode is activated only when \`PORTAL_BACKEND_MODE=database\` is configured for the preview Git branch.** Production remains in local-demo mode.

The staging first administrator is activated via a single-use link sent to the owner’s verified work inbox. The link does not contain a password; the recipient chooses their password on the protected staging website.

Read [Neon staging setup and operational checklist](docs/NEON_STAGING_SETUP.md) for branches, migrations, secrets and production readiness.

## Development

Node.js 22+:

\`\`\`sh
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
\`\`\`

For database testing, configure \`DATABASE_URL\` for the appropriate non-production Neon branch and set \`PORTAL_BACKEND_MODE=database\`. **Never commit database URLs or service credentials.**

## Current production readiness limits

- Work-email ownership verification and automated recovery emails are not implemented in the custom staging authentication flow. New accounts require manual administrator approval.
- Event email notifications and reminders are not yet connected to a transactional email provider.
- Independent cross-device RSVP and concurrent booking tests require activated accounts and staging acceptance testing.
- A separate audited production migration and public access review are required before real employee data is processed.

See [GitHub draft pull request](https://github.com/Ganatra-Ruchir/Corporate-Event-Management-Employee-Registration-Portal/pull/1) for the proposed database integration. Do not merge without approval and staged validation.

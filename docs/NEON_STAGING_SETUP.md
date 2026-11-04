# Neon PostgreSQL staging setup — Elixir Events Portal

This branch adds PostgreSQL schema, server-side sessions and backend API actions. The UI defaults to the existing local demo until explicitly switched to database mode.

## Important safeguards

- Do **not** run the previous \`supabase/migrations/20261102_v2_foundation.sql\` on Neon. It references Supabase Auth.
- Do **not** point preview to the production database branch.
- Never paste connection strings, credentials or bootstrap passwords into chat, GitHub, screenshots or issue discussions.
- Do not enable \`PORTAL_BACKEND_MODE=database\` until the schema and initial administrator exist.
- The prototype's \`Demo@2026!\` passwords are **not** imported to PostgreSQL. Database users require separate credentials.

## 1. Neon database branches

The Neon project is named \`elixir-events\` in AWS Singapore. It should have two branches:
- \`production\`: real production records
- \`staging\`: independent schema/data used for testing

Confirm the branch displayed in the Neon SQL Editor before applying migrations. No user data is copied or initialized by this repository automatically.

## 2. Vercel environment variables

Configure only **Preview** with connections copied from Neon **staging** (prefer the project's secure Neon/Vercel connection flow). Production/Development integration variables may already be provisioned, but do not assume they are staging:

| Name | Environment | Purpose |
| --- | --- | --- |
| \`DATABASE_URL\` | Preview | Staging PostgreSQL pooled connection |
| \`DATABASE_URL_UNPOOLED\` | Preview | Staging direct connection for schema changes |
| \`PORTAL_BACKEND_MODE\` | Preview | Set to \`database\` **after** migrations and initial admin are ready |

Keep \`PORTAL_BACKEND_MODE\` unset in Production. The production site will continue to operate as the existing local browser demo until a separate go-live.

Vercel Preview deployments must be rebuilt after changing environment variables.

## 3. Staging migrations

Run from a trusted development machine where your Neon staging direct connection has been configured securely:

\`\`\`bash
npm install
# Populate DATABASE_URL_UNPOOLED using staging credentials in your terminal's secure environment, not a committed file.
ALLOW_STAGING_MIGRATIONS=true npm run db:migrate
\`\`\`

The script refuses to run when \`VERCEL_ENV=production\` or the staging guard is missing. Before running, verify the Neon connection points to your **staging** database branch, not just the project name.

The migration file is \`db/migrations/001_init.sql\`. It creates organizations, domains, users, sessions, invitations, events, registrations and audit logs.

## 4. Bootstrap first Platform Admin

After migration, use the staging direct connection with the administrator email and a new disposable staging password of at least 14 characters.

\`\`\`bash
ALLOW_STAGING_BOOTSTRAP=true npm run db:bootstrap-admin
\`\`\`

Required environment variables: \`DATABASE_URL_UNPOOLED\`, \`BOOTSTRAP_ADMIN_EMAIL\`, \`BOOTSTRAP_ADMIN_PASSWORD\`, and \`ALLOW_STAGING_BOOTSTRAP=true\`. Supply them through a secure terminal/CI secret manager. The script stops if any platform admin already exists. Remove bootstrap credentials afterward.

## 5. Activate staging preview

Once migration, administrator creation, and login tests are successful, set \`PORTAL_BACKEND_MODE=database\` **only** for the appropriate Vercel Preview environment/branch. Redeploy and verify:
1. Platform administrator logs in and creates a company with approved email domain(s).
2. Employee signs up. Company/Platform administrator approves account. No real email verification is implemented yet.
3. Employee logs in from a second device and sees the organization's events.
4. Company administrator creates and publishes an event, including speaker details.
5. Two employees compete for a final RSVP spot and capacity is never exceeded.
6. Cancelling an RSVP promotes the earliest waitlisted attendee.

## Remaining requirements before real production accounts

- Verify email address ownership with a real provider, not manual approval alone.
- Add production-ready password recovery and email notifications.
- Move banner and speaker photos out of JSON/database into private object storage with signed access.
- Add automated database integration tests (including authorization isolation and concurrent RSVPs).
- Review data protection, monitoring, backups and retention.
- Repeat migrations in a separate production rollout only after completing staging acceptance tests.

This branch is a **staging integration foundation**, not a declaration that the live Neon database has already been migrated.

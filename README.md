# Gatherly — Corporate Event Management & Employee Registration Portal

A multi-organization corporate event app. Organizations create and publish events; employees use invitation codes to join their organization and register for activities. Includes role-aware dashboards, event publishing, capacity-safe registration, participant exports, attendance check-in and organization management.

**Status: functional MVP source code**. Requires your own Supabase project and migrations. Do **not** use real employee data until you complete the security and operational review below.

## Stack

- Next.js 16, React 19, TypeScript, custom responsive CSS, Lucide icons
- Supabase Auth, PostgreSQL and Row Level Security
- Vercel-ready application (no server-side secret keys required)

## Quick start

1. Install Node.js 22 LTS.
2. Create a Supabase project at https://supabase.com/dashboard.
3. Open **SQL Editor** in Supabase; run the SQL in [supabase/migrations/20261102190000_initial_schema.sql](supabase/migrations/20261102190000_initial_schema.sql). Do this on a **new empty project**, not an existing production database.
4. In **Authentication → Providers**, enable Email. Configure email confirmation and production SMTP as required. Add your deployed domain to **Authentication → URL Configuration → Redirect URLs**.
5. Make a local env file by copying \`.env.example\` to \`.env.local\`; replace values with your Supabase **Project URL** and **publishable/anon key**. **Do not put secret or service-role keys here.**
6. Run:

   \`\`\`bash
   npm install
   npm run dev
   \`\`\`

7. Open http://localhost:3000. Create an account. Create an organization to become its admin. In Organization Settings copy the invitation code. Employees can sign up, join using the code, see published events, and register.

### Vercel deployment

Import the GitHub repository into Vercel, configure \`NEXT_PUBLIC_SUPABASE_URL\` and \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` in the project's environment settings, then deploy. Set your Supabase Site URL to the deployed domain and add that domain's \`/auth\` URL to Supabase redirect allow list. Use the correct plan for commercial use.

## Permissions and business rules

- Employees see published events from organizations they have joined and can manage only their own registrations.
- Admins can manage all events and view registrations/member information within their organization.
- PostgreSQL RLS enforces tenant isolation; cross-organization writes are blocked at database level.
- Employee registration runs in a transactional Postgres function that locks the event, enforces capacity, and prevents duplicate active registrations.
- Attendance is updated only by an administrator via a database function.
- Organization membership creation uses unguessable invite codes and always assigns the \`employee\` role. **Anyone who obtains a valid code can join the organization.** For a real rollout, implement invitations tied to verified work email and/or admin approval.
- "Create organization" currently permits any verified signed-in user to create an admin workspace. Organization vetting should be added before production rollout.
- The landing page illustrates **sample** numbers and events only; dashboard data comes from your database.

## Database

\`\`\`text
organizations (id, name, description, created_by)
  ├── memberships (organization_id, user_id, role)
  ├── organization_invites (organization_id, code)
  └── events (id, organization_id, created_by, title, location, start_at, end_at, capacity, status)
       └── registrations (id, event_id, user_id, status, attended_at)
profiles (id, email, full_name)
auth.users (Supabase-managed identities)
\`\`\`

## Routes

| Route | Purpose | Access |
| --- | --- | --- |
| / | Marketing home | All |
| /auth | Sign up / login | All |
| /dashboard | Event overview & KPIs | Organization member |
| /events/new | Create an event | Organization admin |
| /events/[id] | Event details, registration, participant management | Organization member |
| /events/[id]/edit | Edit event | Organization admin |
| /my-registrations | Personal participation history | Signed-in member |
| /organizations/new | Create corporate workspace | Signed-in |
| /join | Join via invitation code | Signed-in |
| /settings | Organization settings & employee directory | Member (admin tools restricted) |

## Priorities before launch

1. Add partner verification/admin approval and domain-scoped invitations.
2. Test SQL RLS with multiple organization accounts, including unauthenticated and malicious client requests.
3. Add automated E2E tests, CI, rate limiting and anti-spam protection.
4. Configure verified SMTP, secure recovery flows, backup retention, email deliverability, abuse handling, monitoring and incident response.
5. Publish a privacy notice and retention policy for employee personal data; define responsibilities with corporate partners.
6. Verify accessibility, mobile device support, local timezone handling and desired cancellation rules.
7. Optional Phase 2: waitlists, QR check-in, volunteering hours, feedback, notifications, certificates and analytics.

## Development checks

\`\`\`bash
npm run typecheck
npm run lint
npm run build
\`\`\`

## Project owner

Built for corporate partner event planning and employee registration. Open source repository maintained by its owner.

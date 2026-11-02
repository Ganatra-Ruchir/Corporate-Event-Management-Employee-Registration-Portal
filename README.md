# Elixir Events Portal

An interactive **database-free** working draft of the corporate partner events and employee registration system.

## Run the entire draft without a database

- [Open the deployed draft](https://emplatfors.vercel.app/)
- Or install Node.js 22+ and run:

```bash
npm install
npm run dev
```

No PostgreSQL, Supabase, Firebase, API server, credentials or environment variables are needed. All sample accounts, organizations, events, changes and registrations stay in this browser's localStorage. Reloading retains changes on the same device; **Reset all sample data** restores original examples.

## Features

**Platform admin:** manage partner companies and permitted work-email domains, suspend companies/accounts, view summary counts, create pending first-admin invitations.

**Company admin:** create and edit draft/published/cancelled events; select in-person, online or hybrid format; set date, location, registration deadline, category and capacity; view participants and export CSV; remove participants; promote and demote team administrators; register personally for their company's events.

**Employee:** sign up with an allowed company email domain, view published upcoming and past company events, search/filter by category or places available, register/cancel with confirmation, view registrations, update profile and demo password.

**Roles** are assigned by the account / invitation, never by a login role selector. Personal/unregistered domains are rejected.

## Fictional demonstration accounts

All three use the password `Demo@2026!`:

| Role | Email |
| --- | --- |
| Platform admin | `admin@elixir.example` |
| Company admin | `alex@northwind.example` |
| Employee | `priya@northwind.example` |

Other fictional company domains: `northwind.example`, `contoso.example`, `contoso-group.example`.

Sample-account buttons on the sign-in page populate credentials; they do not select a role. A real password must **never** be entered in the demo.

## Development checks

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```NaN
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

## V2 preview — speakers and motion

On the staging branch (\`feature/v2-staging-foundation\`), sign in with the fictional
company admin (\`alex@northwind.example\`, password \`Demo@2026!\`) and choose
**Events → an event → Edit event**. The speaker editor supports:

- Up to 12 speakers, each with a JPG/PNG/WebP photo (maximum 5 MB before compression), required descriptive alt text when a photo is supplied, name, job title, organization, talk title, biography, optional agenda slot and HTTPS links.
- Move up/down, remove, and a working card preview in the editor.
- The employee event page shows photo-forward cards with pointer-based tilt on desktop (maximum eight degrees), click/Enter/Space flip, real optional links and scroll controls for more than three speakers.
- At reduced-motion preference, the tilt and flip animations are disabled; the back content is shown without a rotating animation. Speaker details are included in each button's accessible content.
- Purposeful hover/press feedback and short entrance transitions across navigation, cards, RSVP notifications and expandable attendee panels.

The fictional Digital Skills Workshop has example speakers with **initials instead of stock photos**. The host can upload portraits to preview the photography treatment. Photos are resized and stored in the browser's localStorage; because there is no database or file server, media is not shared between devices and large collections may exceed local storage quota (an explicit warning is shown). No real corporate photos should be uploaded into this demonstration.

The separate staging SQL foundation is still **unapplied and untested against a live Supabase project**. This remains a browser-only preview.

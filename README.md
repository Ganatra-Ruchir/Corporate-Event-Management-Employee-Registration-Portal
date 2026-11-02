# Elixir Events Portal — no-database working draft

This branch launches a **browser-only** interactive version of the requested corporate events portal.

**Open the Vercel website or run \`npm run dev\` locally. No Supabase, PostgreSQL, database credentials, server storage, or environment variables are required.**

## What is included

Three fixed account roles selected **from the signed-in account**, never from a login role switch:

- **Platform admin:** lists, creates, edits, suspends and reactivates partner companies, their allowed work-email domains, company admin invitations, and sample account suspension.
- **Company admin:** plans events, saves drafts, publishes or cancels with an optional reason, sees participant lists, removes participants, exports CSV, and promotes or removes company admins. Company admins may register for events.
- **Employee:** signs up with a recognised work-email domain, verifies a sample email, browses published upcoming and past events, filters by category/availability, registers and cancels before an event starts, checks registration history, updates profile and demo password.

The browser-local rules enforce event capacity, registration deadlines, draft visibility, cancellation rules, domain-based company assignment, and role-aware screens. Events may be created with in-person, online, or hybrid settings.

## Try the draft

1. Visit the root page (there is no separate marketing screen).
2. Select one of the three **sample accounts** on the sign-in screen. This only fills the email and password fields; it doesn't choose a role.
3. The sample password for all three is \`Demo@2026!\`.
4. Explore the relevant account features. Sign out to test another account.

Sample addresses (all fictitious):
- Platform admin: \`admin@elixir.example\`
- Company admin: \`alex@northwind.example\`
- Employee: \`priya@northwind.example\`

Other fictitious work domains: \`northwind.example\`, \`contoso.example\`, and \`contoso-group.example\`.

Changes persist **only in the same browser** using localStorage. Use the reset control to restore sample data.

## Run locally / deploy

Requirements: Node.js 22 or newer.

\`\`\`bash
npm install
npm run dev
\`\`\`

Deploy to Vercel with Framework Preset **Next.js** and **default** Output Directory. No environment variables are required to preview the app.

## Scope and limitations

This is a **working front-end draft, not a secure, shared, production application**.

- There is deliberately no database, Supabase connection, server session, server-side authorization or shared employee records in the draft.
- The sample sign-in and roles are browser-local simulations. They are **not secure authentication**, and sample access can be altered through browser developer tools.
- Sign-up email verification and password recovery are simulated on-screen; **no email is sent**. Never use actual work credentials.
- Last-place registration is checked within a single browser. **Concurrent users across devices cannot be safely coordinated without a server-side transactional store.**
- The browser-local demo data can be cleared by browser storage settings, is not shared between devices and is not backed up.
- Actual WCAG 2.2 AA conformance, end-to-end multi-browser testing and cross-organization server security tests cannot be claimed without a backend and formal accessibility testing.

The app does **not** implement the explicitly excluded features: QR check-in, certificates, volunteering hours, analytics charts, payments, chat, AI, notifications or gamification.

The previously drafted Supabase app code and migration remain in this repository as **future backend planning files**, but the new entry point uses none of those files. Historical backend URLs redirect to the database-free root experience.

## When database integration is approved

Add real email verification and password reset, server authorization and Row Level Security, transactional registration, account provisioning, and tests for cross-company isolation and simultaneous last-place registration. The previous migration should be reviewed and updated for the final three-role business requirements rather than run unchanged.

## Checks

\`\`\`bash
npm run typecheck
npm run lint
npm run build
\`\`\`

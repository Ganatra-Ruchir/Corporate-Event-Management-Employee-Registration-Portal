# V2 staging foundation — implementation contract

## Environments
- **Production:** the existing \`main\` branch and \`emplatfors.vercel.app\` remain unchanged.
- **Preview:** \`feature/v2-staging-foundation\` Vercel preview. No production alias.
- **Browser mode (default):** no database needed. All fictional demo state is local to the browser.
- **Staging mode (future):** a NEW Elixir-only Supabase project with separate preview environment keys. The available "Sashakt Central Database" is unrelated and must never be reused.

## Foundation phase
- Initial relational schema, private helpers, RLS, capacity-safe registration and waitlist promotion are in \`supabase/migrations/20261102_v2_foundation.sql\`.
- The migration is **not yet applied to any project**; no real database tests have run.
- Auth and images will use Supabase only once staging is provisioned. Browser fallback is not a production authorization boundary.
- A shared domain model should drive both adapters. Do not duplicate UI pages.

## Permissions
| Resource | Employee | Host (can_host) | Company admin | Platform admin |
| --- | --- | --- | --- | --- |
| Own profile | read/edit | read/edit | read/edit | read/edit |
| Company profiles | opted-in attendees | opted-in attendees | own company | cross-company oversight |
| Events | published, own company | published + own assigned drafts | own company | read-only |
| Events write | no | own assigned | own company | no by default |
| Registrations | own records, secured RPC | own / managed event | own company | no direct access |
| Companies | own company | own company | own company | full management once admin APIs added |
| Domains and membership privileges | no | no | own company, through vetted RPC | through vetted RPC |
| Notification jobs | no direct access | none | none | worker only |

## Release gates
1. Current branch passes typecheck, lint, tests and Next.js build.
2. Staging project provisioned and migration reviewed / run.
3. DB isolation tests as different authenticated companies plus 2-concurrent-last-place integration test.
4. Preview approved. Do NOT deploy onto main until explicit permission.

## Remaining work
Phase 1 is a **foundation commit**, not a claimed finished Supabase integration. Schema requires a security audit, provisioning flow, platform-admin policies, signup-domain enforcement and signed-image storage before connecting real employee data.

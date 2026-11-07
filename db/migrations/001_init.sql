-- Neon PostgreSQL schema for Elixir Events. No Supabase auth or extensions required.
-- Apply ONLY against a dedicated staging database first.
BEGIN;
CREATE TABLE IF NOT EXISTS organizations (
 id text PRIMARY KEY,
 name text NOT NULL CHECK (length(trim(name)) BETWEEN 3 AND 160),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organization_domains (
 domain text PRIMARY KEY CHECK(domain=lower(domain)),
 organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY,
 full_name text NOT NULL CHECK(length(trim(full_name)) >= 2),
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 department text NOT NULL DEFAULT '',
 role text NOT NULL DEFAULT 'employee' CHECK(role IN ('platform_admin','company_admin','employee')),
 organization_id text REFERENCES organizations(id),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 verified boolean NOT NULL DEFAULT false,
 show_in_attendee_lists boolean NOT NULL DEFAULT true,
 failed_attempts integer NOT NULL DEFAULT 0,
 locked_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (email=lower(email)),
 CHECK ((role='platform_admin' AND organization_id IS NULL) OR (role<>'platform_admin' AND organization_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS users_organization_idx ON users(organization_id);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY,
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS invitations (
 id text PRIMARY KEY,
 email text NOT NULL,
 organization_id text NOT NULL REFERENCES organizations(id),
 role text NOT NULL DEFAULT 'company_admin' CHECK (role='company_admin'),
 accepted boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_pending_idx ON invitations(email) WHERE NOT accepted;
CREATE TABLE IF NOT EXISTS events (
 id text PRIMARY KEY,
 organization_id text NOT NULL REFERENCES organizations(id),
 created_by text NOT NULL REFERENCES users(id),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 3 AND 160),
 status text NOT NULL CHECK(status IN ('draft','published','cancelled')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 100000),
 waitlist_enabled boolean NOT NULL DEFAULT true,
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at),
 CHECK(jsonb_typeof(payload)='object')
);
CREATE INDEX IF NOT EXISTS events_organization_starts_idx ON events(organization_id,starts_at);
CREATE TABLE IF NOT EXISTS registrations (
 id text PRIMARY KEY,
 event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('going','waitlisted','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 waitlisted_at timestamptz,
 promoted_at timestamptz,
 cancelled_at timestamptz,
 UNIQUE(event_id,user_id)
);
CREATE INDEX IF NOT EXISTS registrations_queue_idx ON registrations(event_id,waitlisted_at,id) WHERE status='waitlisted';
CREATE TABLE IF NOT EXISTS audit_logs (
 id bigserial PRIMARY KEY,
 actor_user_id text REFERENCES users(id),
 organization_id text REFERENCES organizations(id),
 action text NOT NULL,
 subject_id text,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;

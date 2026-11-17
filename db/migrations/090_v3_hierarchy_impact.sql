-- Additive V3 staging schema. Existing companies, accounts, events and RSVPs are preserved.
BEGIN;
CREATE TABLE IF NOT EXISTS v3_countries (
 organization_id text NOT NULL REFERENCES organizations(id),
 code text NOT NULL CHECK(code ~ '^[A-Z]{2}$'),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 100),
 PRIMARY KEY(organization_id,code)
);
CREATE TABLE IF NOT EXISTS v3_states (
 id text PRIMARY KEY, organization_id text NOT NULL, country_code text NOT NULL,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 100),
 FOREIGN KEY(organization_id,country_code) REFERENCES v3_countries(organization_id,code),
 UNIQUE(organization_id,country_code,id), UNIQUE(organization_id,country_code,name)
);
CREATE TABLE IF NOT EXISTS v3_branches (
 id text PRIMARY KEY, organization_id text NOT NULL, country_code text NOT NULL, state_id text NOT NULL,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 160),
 FOREIGN KEY(organization_id,country_code,state_id) REFERENCES v3_states(organization_id,country_code,id),
 UNIQUE(organization_id,country_code,state_id,id), UNIQUE(state_id,name)
);
CREATE TABLE IF NOT EXISTS v3_memberships (
 user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 organization_id text NOT NULL, country_code text NOT NULL, state_id text, branch_id text,
 level text NOT NULL CHECK(level IN ('country_admin','state_admin','employee')),
 FOREIGN KEY(organization_id,country_code) REFERENCES v3_countries(organization_id,code),
 FOREIGN KEY(organization_id,country_code,state_id) REFERENCES v3_states(organization_id,country_code,id),
 FOREIGN KEY(organization_id,country_code,state_id,branch_id) REFERENCES v3_branches(organization_id,country_code,state_id,id),
 CHECK((level='country_admin' AND state_id IS NULL AND branch_id IS NULL) OR
 (level='state_admin' AND state_id IS NOT NULL AND branch_id IS NULL) OR
 (level='employee' AND state_id IS NOT NULL AND branch_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS v3_memberships_scope_idx ON v3_memberships(organization_id,country_code,state_id,branch_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS v3_temporary_password_expires_at timestamptz;
CREATE TABLE IF NOT EXISTS v3_contributions (
 event_id text NOT NULL, user_id text NOT NULL,
 volunteer_minutes integer NOT NULL CHECK(volunteer_minutes BETWEEN 0 AND 10080),
 contribution text NOT NULL DEFAULT '' CHECK(length(contribution)<=1000),
 verified_by text NOT NULL REFERENCES users(id), verified_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(event_id,user_id),
 FOREIGN KEY(event_id,user_id) REFERENCES registrations(event_id,user_id) ON DELETE CASCADE
);
COMMIT;

-- Single-use, expiring setup links for the first platform administrator.
CREATE TABLE IF NOT EXISTS admin_setup_tokens (
 token_hash text PRIMARY KEY,
 email text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 used_at timestamptz
);
CREATE INDEX IF NOT EXISTS admin_setup_tokens_expiry_idx ON admin_setup_tokens(expires_at);
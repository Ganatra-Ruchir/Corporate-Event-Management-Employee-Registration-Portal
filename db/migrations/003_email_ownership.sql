-- New employee accounts must complete Neon email OTP verification before this portal creates them.
-- Existing unapproved staging accounts can be reviewed by an administrator.
COMMENT ON COLUMN users.verified IS 'Portal administrator approval, independent of Neon Auth email ownership verification';

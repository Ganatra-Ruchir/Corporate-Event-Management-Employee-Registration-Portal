ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title text NOT NULL DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_storage_key text;
CREATE INDEX IF NOT EXISTS idx_users_org_role ON public.users(organization_id,role,status);

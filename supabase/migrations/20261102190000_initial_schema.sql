-- Corporate Events Portal: run in Supabase SQL editor or apply with Supabase CLI.
-- Never place service-role keys in the browser. All exposed tables use RLS.
create schema if not exists private;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 120),
  description text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  created_at timestamptz not null default now()
);
create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','employee')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create table public.organization_invites (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text not null default '',
  category text not null default 'Volunteering',
  location text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 100000),
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now(),
  constraint valid_event_window check (end_at > start_at)
);
create index events_org_start on public.events(organization_id,start_at);
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered','cancelled')),
  registered_at timestamptz not null default now(),
  attended_at timestamptz,
  unique(event_id,user_id)
);
create index registrations_event_status on public.registrations(event_id,status);
create index registrations_user on public.registrations(user_id);

-- Membership checks use a narrowly scoped helper to avoid recursive membership RLS.
create function private.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.memberships m where m.organization_id = p_org and m.user_id = (select auth.uid())) $$;
create function private.is_org_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.memberships m where m.organization_id = p_org and m.user_id = (select auth.uid()) and m.role = 'admin') $$;

create function private.create_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id,email,full_name)
  values(new.id,new.email,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1)))
  on conflict(id) do nothing;
  return new;
end $$;
create trigger after_auth_user_created after insert on auth.users
for each row execute function private.create_profile();

-- Admin organization creation; invite codes generated on the server only.
create function public.create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_org uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 3 and 120 then
    raise exception 'Organization name must be 3–120 characters';
  end if;
  insert into public.organizations(name,created_by) values(trim(p_name),(select auth.uid())) returning id into v_org;
  insert into public.memberships(organization_id,user_id,role) values(v_org,(select auth.uid()),'admin');
  insert into public.organization_invites(organization_id,code)
  values(v_org,replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));
  return v_org;
end $$;

-- Users join only as employees; invite codes have 128-bit entropy.
create function public.join_organization(p_code text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_org uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select organization_id into v_org from public.organization_invites
    where code = lower(trim(coalesce(p_code,'')));
  if v_org is null then raise exception 'Invalid organization invitation code'; end if;
  insert into public.memberships(organization_id,user_id,role)
  values(v_org,(select auth.uid()),'employee')
  on conflict(organization_id,user_id) do nothing;
  return v_org;
end $$;

-- Serialize capacity checks on the event row, including concurrent registrations.
create function public.register_for_event(p_event_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_event public.events%rowtype; v_active integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select * into v_event from public.events where id=p_event_id for update;
  if not found then raise exception 'Event not found'; end if;
  if not private.is_org_member(v_event.organization_id) then raise exception 'Not a member of this organization'; end if;
  if v_event.status <> 'published' then raise exception 'Registration is closed'; end if;
  if v_event.start_at <= now() then raise exception 'This event has already started'; end if;
  if exists(select 1 from public.registrations where event_id=p_event_id
            and user_id=(select auth.uid()) and status='registered') then return; end if;
  select count(*) into v_active from public.registrations where event_id=p_event_id and status='registered';
  if v_active >= v_event.capacity then raise exception 'Event is fully booked'; end if;
  insert into public.registrations(event_id,user_id,status)
    values(p_event_id,(select auth.uid()),'registered')
  on conflict(event_id,user_id)
    do update set status='registered',registered_at=now(),attended_at=null;
end $$;

create function public.cancel_registration(p_event_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  update public.registrations set status='cancelled',attended_at=null
  where event_id=p_event_id and user_id=(select auth.uid()) and status='registered';
end $$;

create function public.set_attendance(p_event_id uuid,p_user_id uuid,p_present boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_org uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select organization_id into v_org from public.events where id=p_event_id;
  if v_org is null or not private.is_org_admin(v_org) then raise exception 'Admin permission required'; end if;
  update public.registrations
  set attended_at = case when p_present then now() else null end
  where event_id = p_event_id and user_id = p_user_id and status='registered';
  if not found then raise exception 'Active registration not found'; end if;
end $$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.organization_invites enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

create policy org_view on public.organizations for select to authenticated
using (private.is_org_member(id));
create policy org_admin_update on public.organizations for update to authenticated
using (private.is_org_admin(id)) with check (private.is_org_admin(id));

create policy own_or_org_admin_profile on public.profiles for select to authenticated
using (id=(select auth.uid()) or exists(
  select 1 from public.memberships m
  where m.user_id=profiles.id and private.is_org_admin(m.organization_id)
));
create policy own_profile_update on public.profiles for update to authenticated
using (id=(select auth.uid())) with check (id=(select auth.uid()));

create policy membership_view on public.memberships for select to authenticated
using (user_id=(select auth.uid()) or private.is_org_admin(organization_id));
create policy invite_admin_view on public.organization_invites for select to authenticated
using (private.is_org_admin(organization_id));

create policy event_member_view on public.events for select to authenticated
using (private.is_org_member(organization_id) and (status='published' or private.is_org_admin(organization_id)));
create policy event_admin_insert on public.events for insert to authenticated
with check (private.is_org_admin(organization_id) and created_by=(select auth.uid()));
create policy event_admin_update on public.events for update to authenticated
using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));
create policy event_admin_delete on public.events for delete to authenticated
using (private.is_org_admin(organization_id));

create policy registration_self_or_admin_view on public.registrations for select to authenticated
using (user_id=(select auth.uid()) or exists(
  select 1 from public.events e where e.id=registrations.event_id and private.is_org_admin(e.organization_id)
));

-- Strict table grants: direct membership, invite, and registration mutations are never granted.
revoke all on public.organizations,public.profiles,public.memberships,
  public.organization_invites,public.events,public.registrations from anon,authenticated;
grant select on public.organizations,public.profiles,public.memberships,
  public.organization_invites,public.events,public.registrations to authenticated;
grant update(name,description) on public.organizations to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant insert,delete on public.events to authenticated;
grant update(title,description,category,location,start_at,end_at,capacity,status) on public.events to authenticated;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.is_org_member(uuid),private.is_org_admin(uuid) from public;
grant execute on function private.is_org_member(uuid),private.is_org_admin(uuid) to authenticated;
revoke all on function private.create_profile() from public;
revoke all on function public.create_organization(text),public.join_organization(text),
  public.register_for_event(uuid),public.cancel_registration(uuid),
  public.set_attendance(uuid,uuid,boolean) from public;
grant execute on function public.create_organization(text),public.join_organization(text),
  public.register_for_event(uuid),public.cancel_registration(uuid),
  public.set_attendance(uuid,uuid,boolean) to authenticated;

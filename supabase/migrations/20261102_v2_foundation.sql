-- Elixir Events Portal V2 — staging foundation.
-- This migration is NOT applied automatically. Review and apply to a NEW staging Supabase project.
-- All public tables enable RLS; registration mutations use vetted, locked RPCs.
create schema if not exists app_private;

create table public.companies(
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 3 and 160),
 status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now()
);
create table public.company_domains(
 company_id uuid not null references public.companies(id) on delete cascade,
 domain text primary key check(domain = lower(domain) and domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
 created_at timestamptz not null default now()
);
create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 email text not null,
 job_title text not null default '',
 department text not null default '',
 bio text not null default '',
 show_in_attendee_lists boolean not null default true,
 avatar_path text,
 created_at timestamptz not null default now()
);
create table public.memberships(
 company_id uuid not null references public.companies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'employee' check(role in ('employee','company_admin')),
 can_host boolean not null default false,
 status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now(),
 primary key(company_id,user_id)
);
create table public.platform_admins(
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.events(
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 host_user_id uuid not null references auth.users(id),
 title text not null check(length(trim(title)) between 3 and 180),
 summary text not null default '',
 description text not null default '',
 category text not null default 'Volunteering',
 format text not null default 'in_person' check(format in ('in_person','online','hybrid')),
 location text not null default '',
 online_url text not null default '',
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 registration_deadline timestamptz,
 capacity int not null check(capacity between 1 and 100000),
 waitlist_enabled boolean not null default true,
 featured boolean not null default false,
 banner_path text,
 banner_alt text,
 contact_email text not null,
 status text not null default 'draft' check(status in ('draft','published','cancelled')),
 cancellation_reason text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_at > starts_at),
 check(registration_deadline is null or registration_deadline <= starts_at),
 check(banner_path is null or length(trim(coalesce(banner_alt,'')))>0)
);
create index events_company_time on public.events(company_id,starts_at);
create table public.speakers(
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 display_order int not null default 0,
 full_name text not null,
 job_title text not null default '',
 company text not null default '',
 talk_title text not null default '',
 bio text not null default '',
 photo_path text,
 photo_alt text,
 website_url text,
 check(photo_path is null or length(trim(coalesce(photo_alt,'')))>0)
);
create table public.agenda_items(
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 speaker_id uuid references public.speakers(id) on delete set null,
 display_order int not null default 0,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 title text not null,
 check(ends_at > starts_at)
);
create table public.registrations(
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null check(status in ('going','waitlisted','cancelled')),
 created_at timestamptz not null default now(),
 waitlisted_at timestamptz,
 promoted_at timestamptz,
 cancelled_at timestamptz,
 unique(event_id,user_id),
 check(status <> 'waitlisted' or waitlisted_at is not null)
);
create index registrations_queue on public.registrations(event_id,waitlisted_at,id) where status='waitlisted';
create index registrations_going on public.registrations(event_id) where status='going';
create table public.notification_jobs(
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('rsvp','reminder','promoted','event_changed','event_cancelled')),
 due_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','processing','sent','failed')),
 attempts int not null default 0,
 last_error text,
 sent_at timestamptz,
 unique(event_id,user_id,kind,due_at)
);

-- Every exposed table is deny-by-default.
alter table public.companies enable row level security;
alter table public.company_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_admins enable row level security;
alter table public.events enable row level security;
alter table public.speakers enable row level security;
alter table public.agenda_items enable row level security;
alter table public.registrations enable row level security;
alter table public.notification_jobs enable row level security;

-- Helpers are intentionally outside exposed public schema. Every helper explicitly checks identity.
create function app_private.is_platform_admin() returns boolean
language sql stable security definer set search_path=''
as $$ select (select auth.uid()) is not null and exists(
 select 1 from public.platform_admins p where p.user_id=(select auth.uid())
); $$;
create function app_private.is_member(p_company uuid) returns boolean
language sql stable security definer set search_path=''
as $$ select (select auth.uid()) is not null and exists(
 select 1 from public.memberships m join public.companies c on c.id=m.company_id
 where m.company_id=p_company and m.user_id=(select auth.uid())
 and m.status='active' and c.status='active'
); $$;
create function app_private.can_manage(p_company uuid,p_event uuid default null) returns boolean
language sql stable security definer set search_path=''
as $$ select (select auth.uid()) is not null and exists(
 select 1 from public.memberships m join public.companies c on c.id=m.company_id
 where m.company_id=p_company and m.user_id=(select auth.uid())
 and m.status='active' and c.status='active'
 and (m.role='company_admin' or (
   m.can_host=true and (p_event is null or exists(
     select 1 from public.events e where e.id=p_event and e.company_id=p_company and e.host_user_id=(select auth.uid())
   ))
 ))
); $$;
create function app_private.is_verified() returns boolean
language sql stable security definer set search_path=''
as $$ select (select auth.uid()) is not null and exists(
 select 1 from auth.users u where u.id=(select auth.uid()) and u.email_confirmed_at is not null
); $$;

create policy company_visibility on public.companies for select to authenticated
using(app_private.is_platform_admin() or app_private.is_member(id));
create policy company_domains_visibility on public.company_domains for select to authenticated
using(app_private.is_platform_admin() or app_private.can_manage(company_id));

create policy own_or_company_profiles on public.profiles for select to authenticated
using(id=(select auth.uid()) or app_private.is_platform_admin() or exists(
 select 1 from public.memberships m where m.user_id=profiles.id and
 (app_private.can_manage(m.company_id) or (show_in_attendee_lists and app_private.is_member(m.company_id)))
));
create policy own_profile_update on public.profiles for update to authenticated
using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy membership_visibility on public.memberships for select to authenticated
using(user_id=(select auth.uid()) or app_private.is_platform_admin() or app_private.can_manage(company_id));
create policy platform_admin_self on public.platform_admins for select to authenticated
using(user_id=(select auth.uid()));
create policy event_visibility on public.events for select to authenticated
using(app_private.is_platform_admin() or (app_private.is_member(company_id)
 and (status='published' or app_private.can_manage(company_id,id))));
create policy event_create on public.events for insert to authenticated
with check(app_private.is_member(company_id) and app_private.can_manage(company_id)
 and created_by=(select auth.uid()) and host_user_id=(select auth.uid()));
create policy event_update on public.events for update to authenticated
using(app_private.can_manage(company_id,id))
with check(app_private.can_manage(company_id,id));
create policy event_delete on public.events for delete to authenticated
using(app_private.can_manage(company_id,id));
create policy speaker_visibility on public.speakers for select to authenticated
using(exists(select 1 from public.events e where e.id=speakers.event_id));
create policy speaker_create on public.speakers for insert to authenticated
with check(exists(select 1 from public.events e where e.id=speakers.event_id and app_private.can_manage(e.company_id,e.id)));
create policy speaker_edit on public.speakers for update to authenticated
using(exists(select 1 from public.events e where e.id=speakers.event_id and app_private.can_manage(e.company_id,e.id)))
with check(exists(select 1 from public.events e where e.id=speakers.event_id and app_private.can_manage(e.company_id,e.id)));
create policy speaker_delete on public.speakers for delete to authenticated
using(exists(select 1 from public.events e where e.id=speakers.event_id and app_private.can_manage(e.company_id,e.id)));
create policy agenda_visibility on public.agenda_items for select to authenticated
using(exists(select 1 from public.events e where e.id=agenda_items.event_id));
create policy agenda_create on public.agenda_items for insert to authenticated
with check(exists(select 1 from public.events e where e.id=agenda_items.event_id and app_private.can_manage(e.company_id,e.id)));
create policy agenda_edit on public.agenda_items for update to authenticated
using(exists(select 1 from public.events e where e.id=agenda_items.event_id and app_private.can_manage(e.company_id,e.id)))
with check(exists(select 1 from public.events e where e.id=agenda_items.event_id and app_private.can_manage(e.company_id,e.id)));
create policy agenda_delete on public.agenda_items for delete to authenticated
using(exists(select 1 from public.events e where e.id=agenda_items.event_id and app_private.can_manage(e.company_id,e.id)));
create policy registration_visibility on public.registrations for select to authenticated
using(user_id=(select auth.uid()) or exists(
 select 1 from public.events e where e.id=registrations.event_id and app_private.can_manage(e.company_id,e.id)
));
-- Registrations have no direct authenticated INSERT/UPDATE/DELETE grants.
-- A privileged transaction is the *only* mutation path.
revoke all on public.companies,public.company_domains,public.profiles,public.memberships,
 public.platform_admins,public.events,public.speakers,public.agenda_items,public.registrations,
 public.notification_jobs from anon,authenticated;
grant select on public.companies,public.company_domains,public.profiles,public.memberships,
 public.platform_admins,public.events,public.speakers,public.agenda_items,public.registrations to authenticated;
grant update(full_name,job_title,department,bio,show_in_attendee_lists,avatar_path) on public.profiles to authenticated;
grant insert,delete on public.events to authenticated;
grant update(title,summary,description,category,format,location,online_url,starts_at,ends_at,
 registration_deadline,waitlist_enabled,featured,banner_path,banner_alt,contact_email,status,
 cancellation_reason,updated_at) on public.events to authenticated;
grant insert,update,delete on public.speakers,public.agenda_items to authenticated;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
revoke all on function app_private.is_platform_admin(),
 app_private.is_member(uuid),app_private.can_manage(uuid,uuid),app_private.is_verified() from public;
grant execute on function app_private.is_platform_admin(),
 app_private.is_member(uuid),app_private.can_manage(uuid,uuid),app_private.is_verified() to authenticated;

-- All RSVP/cancellation/capacity modifications lock the parent event first to serialize requests.
create function public.rsvp_event(p_event uuid) returns text
language plpgsql security definer set search_path=''
as $$
declare v_e public.events%rowtype;v_count int;v_status text;v_uid uuid;
begin
 v_uid=(select auth.uid());
 if v_uid is null or not app_private.is_verified() then raise exception 'Verified login required';end if;
 select * into v_e from public.events where id=p_event for update;
 if not found then raise exception 'Event not found';end if;
 if not app_private.is_member(v_e.company_id) then raise exception 'No access to this company';end if;
 if v_e.status <> 'published' or v_e.starts_at<=now() or
   (v_e.registration_deadline is not null and v_e.registration_deadline<=now())
 then raise exception 'Registration closed';end if;
 select status into v_status from public.registrations where event_id=p_event and user_id=v_uid;
 if v_status in ('going','waitlisted') then return v_status;end if;
 select count(*) into v_count from public.registrations where event_id=p_event and status='going';
 if v_count<v_e.capacity then v_status='going';
 elsif v_e.waitlist_enabled then v_status='waitlisted';
 else raise exception 'Event full';end if;
 insert into public.registrations(event_id,user_id,status,waitlisted_at,promoted_at,cancelled_at)
 values(p_event,v_uid,v_status,case when v_status='waitlisted' then now() else null end,null,null)
 on conflict(event_id,user_id) do update set
 status=excluded.status,created_at=now(),waitlisted_at=excluded.waitlisted_at,
 promoted_at=null,cancelled_at=null;
 if v_status='going' then
 insert into public.notification_jobs(event_id,user_id,kind,due_at)
 values(p_event,v_uid,'rsvp',now()) on conflict do nothing;
 end if;
 return v_status;
end $$;

create function app_private.promote_locked(p_event uuid,p_capacity int) returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count int;v_next uuid;v_promotions int:=0;
begin
 select count(*) into v_count from public.registrations where event_id=p_event and status='going';
 while v_count<p_capacity loop
  select id into v_next from public.registrations
   where event_id=p_event and status='waitlisted'
   order by waitlisted_at asc,id asc limit 1 for update;
  exit when v_next is null;
  update public.registrations set status='going',promoted_at=now()
   where id=v_next;
  insert into public.notification_jobs(event_id,user_id,kind,due_at)
   select event_id,user_id,'promoted',now() from public.registrations where id=v_next
   on conflict do nothing;
  v_count=v_count+1;v_promotions=v_promotions+1;
 end loop;
 return v_promotions;
end $$;
create function public.cancel_rsvp(p_event uuid) returns void
language plpgsql security definer set search_path=''
as $$
declare v_e public.events%rowtype;v_old text;
begin
 if (select auth.uid()) is null or not app_private.is_verified() then raise exception 'Verified login required';end if;
 select * into v_e from public.events where id=p_event for update;
 if not found or not app_private.is_member(v_e.company_id) then raise exception 'Event not found';end if;
 if v_e.starts_at<=now() then raise exception 'Event has started';end if;
 select status into v_old from public.registrations where event_id=p_event and user_id=(select auth.uid());
 if v_old not in ('going','waitlisted') or v_old is null then raise exception 'No active RSVP';end if;
 update public.registrations set status='cancelled',cancelled_at=now()
 where event_id=p_event and user_id=(select auth.uid());
 if v_old='going' and v_e.status='published' then
  perform app_private.promote_locked(p_event,v_e.capacity);
 end if;
end $$;

create function public.set_event_capacity(p_event uuid,p_capacity int) returns integer
language plpgsql security definer set search_path=''
as $$
declare v_e public.events%rowtype;v_count int;
begin
 if (select auth.uid()) is null or not app_private.is_verified() then raise exception 'Verified login required';end if;
 select * into v_e from public.events where id=p_event for update;
 if not found or not app_private.can_manage(v_e.company_id,v_e.id) then raise exception 'Permission denied';end if;
 if p_capacity<1 or p_capacity>100000 then raise exception 'Invalid capacity';end if;
 select count(*) into v_count from public.registrations where event_id=p_event and status='going';
 if p_capacity<v_count then raise exception 'Capacity below active registrations';end if;
 update public.events set capacity=p_capacity,updated_at=now() where id=p_event;
 if v_e.status='published' and v_e.starts_at>now() then
  return app_private.promote_locked(p_event,p_capacity);
 end if;
 return 0;
end $$;

revoke all on function app_private.promote_locked(uuid,int) from public;
revoke all on function public.rsvp_event(uuid),public.cancel_rsvp(uuid),public.set_event_capacity(uuid,int) from public;
grant execute on function public.rsvp_event(uuid),public.cancel_rsvp(uuid),public.set_event_capacity(uuid,int) to authenticated;

-- Future phases:
-- * create secure platform-admin onboarding and work-domain invites, never client-editable role claims
-- * private company image buckets, sized image validation, speaker photos
-- * Resend delivery worker that processes notification_jobs, retries and schedules 24-hour reminders
-- * real two-connection isolation and last-place race integration tests in a dedicated staging database.

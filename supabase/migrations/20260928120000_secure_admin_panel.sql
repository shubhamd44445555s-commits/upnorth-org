-- UpNorth.org additive secure admin panel migration.
-- Does not drop or reset existing application tables.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role in ('super_admin', 'admin', 'editor', 'moderator', 'business_manager', 'viewer', 'business_owner')
);

alter table public.audit_logs add column if not exists ip_address text;
alter table public.audit_logs add column if not exists user_agent text;
alter table public.audit_logs add column if not exists success boolean not null default true;

create table if not exists public.admin_permissions (
  key text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_role_permissions (
  role text not null,
  permission_key text not null references public.admin_permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role, permission_key)
);

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  success boolean not null default true,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_role_permissions_role_idx on public.admin_role_permissions(role);
create index if not exists security_events_actor_created_idx on public.security_events(actor_id, created_at desc);
create index if not exists security_events_created_idx on public.security_events(created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

insert into public.admin_permissions (key, description) values
  ('dashboard.read', 'View the admin dashboard'),
  ('businesses.read', 'Read business listings'),
  ('businesses.manage', 'Publish, unpublish, and manage listing flags'),
  ('submissions.review', 'Approve or reject business submissions'),
  ('claims.review', 'Approve or reject business claims'),
  ('towns.manage', 'Manage town content'),
  ('events.manage', 'Publish and manage events'),
  ('newsletter.read', 'Read newsletter subscriber records'),
  ('contact.read', 'Read contact messages'),
  ('users.read', 'Read user profiles'),
  ('admins.manage', 'Manage administrator roles'),
  ('ai.read', 'View AI configuration status'),
  ('settings.read', 'Read site settings'),
  ('settings.update', 'Change site settings'),
  ('media.manage', 'Manage approved media'),
  ('audit.read', 'Read audit logs'),
  ('audit.write', 'Write administrative audit events'),
  ('security.read', 'Read security events'),
  ('security.manage', 'Change security configuration')
on conflict (key) do update set description = excluded.description;

insert into public.admin_role_permissions (role, permission_key)
select 'super_admin', key from public.admin_permissions
on conflict do nothing;

insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'dashboard.read'), ('admin', 'businesses.read'), ('admin', 'businesses.manage'),
  ('admin', 'submissions.review'), ('admin', 'claims.review'), ('admin', 'towns.manage'),
  ('admin', 'events.manage'), ('admin', 'newsletter.read'), ('admin', 'contact.read'),
  ('admin', 'users.read'), ('admin', 'ai.read'), ('admin', 'settings.read'),
  ('admin', 'media.manage'), ('admin', 'audit.read'), ('admin', 'audit.write'), ('admin', 'security.read'),
  ('editor', 'dashboard.read'), ('editor', 'businesses.read'), ('editor', 'businesses.manage'),
  ('editor', 'submissions.review'), ('editor', 'claims.review'), ('editor', 'towns.manage'),
  ('editor', 'events.manage'), ('editor', 'media.manage'), ('editor', 'audit.read'), ('editor', 'audit.write'),
  ('moderator', 'dashboard.read'), ('moderator', 'businesses.read'), ('moderator', 'submissions.review'),
  ('moderator', 'claims.review'), ('moderator', 'events.manage'), ('moderator', 'audit.write'),
  ('business_manager', 'dashboard.read'), ('business_manager', 'businesses.read'),
  ('business_manager', 'businesses.manage'), ('business_manager', 'submissions.review'),
  ('business_manager', 'claims.review'), ('business_manager', 'audit.write'),
  ('viewer', 'dashboard.read'), ('viewer', 'businesses.read')
on conflict do nothing;

create or replace function private.has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.admin_role_permissions rp on rp.role = p.role
    where p.id = (select auth.uid())
      and rp.permission_key = requested_permission
  );
$$;

revoke all on function private.has_permission(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.has_permission(text) to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_permission('audit.read') or private.has_permission('security.read');
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.security_events enable row level security;
revoke all on public.admin_permissions, public.admin_role_permissions from anon, authenticated;
grant select on public.security_events to authenticated;
grant insert on public.security_events to authenticated;

drop policy if exists "Admins can manage towns" on public.towns;
drop policy if exists "Admins can read all towns" on public.towns;
create policy "Authorized users can read all towns" on public.towns for select to authenticated
  using (status = 'published' or private.has_permission('towns.manage'));
create policy "Authorized users can manage towns" on public.towns for all to authenticated
  using (private.has_permission('towns.manage')) with check (private.has_permission('towns.manage'));

drop policy if exists "Admins can manage listings" on public.listings;
drop policy if exists "Authorized users can read all listings" on public.listings;
create policy "Authorized users can read all listings" on public.listings for select to authenticated
  using (status = 'published' or private.has_permission('businesses.read'));
create policy "Authorized users can insert listings" on public.listings for insert to authenticated
  with check (private.has_permission('businesses.manage'));
create policy "Authorized users can update listings" on public.listings for update to authenticated
  using (private.has_permission('businesses.manage')) with check (private.has_permission('businesses.manage'));
create policy "Authorized users can delete listings" on public.listings for delete to authenticated
  using (private.has_permission('businesses.manage'));

drop policy if exists "Admins can manage events" on public.events;
create policy "Authorized users can read all events" on public.events for select to authenticated
  using (status = 'published' or private.has_permission('events.manage'));
create policy "Authorized users can insert events" on public.events for insert to authenticated
  with check (private.has_permission('events.manage'));
create policy "Authorized users can update events" on public.events for update to authenticated
  using (private.has_permission('events.manage')) with check (private.has_permission('events.manage'));
create policy "Authorized users can delete events" on public.events for delete to authenticated
  using (private.has_permission('events.manage'));

drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Authorized users can read profiles" on public.profiles;
drop policy if exists "Users can read their profile" on public.profiles;
create policy "Authorized users can read profiles" on public.profiles for select to authenticated
  using ((select auth.uid()) = id or private.has_permission('users.read'));
create policy "Super admins can manage profiles" on public.profiles for update to authenticated
  using (private.has_permission('admins.manage') and id <> (select auth.uid()))
  with check (private.has_permission('admins.manage') and id <> (select auth.uid()));

drop policy if exists "Admins can review submissions" on public.business_submissions;
drop policy if exists "Submitters can read their submissions" on public.business_submissions;
create policy "Submitters can read their submissions" on public.business_submissions for select to authenticated
  using ((select auth.uid()) = submitted_by or private.has_permission('submissions.review'));
create policy "Authorized users can review submissions" on public.business_submissions for update to authenticated
  using (private.has_permission('submissions.review')) with check (private.has_permission('submissions.review'));

drop policy if exists "Admins can review claims" on public.listing_claims;
drop policy if exists "Claimants can read their claims" on public.listing_claims;
create policy "Claimants can read their claims" on public.listing_claims for select to authenticated
  using ((select auth.uid()) = submitted_by or private.has_permission('claims.review'));
create policy "Authorized users can review claims" on public.listing_claims for update to authenticated
  using (private.has_permission('claims.review')) with check (private.has_permission('claims.review'));

drop policy if exists "Admins can read subscribers" on public.newsletter_subscribers;
create policy "Authorized users can read subscribers" on public.newsletter_subscribers for select to authenticated
  using (private.has_permission('newsletter.read'));

drop policy if exists "Admins can read contact messages" on public.contact_messages;
create policy "Authorized users can read contact messages" on public.contact_messages for select to authenticated
  using (private.has_permission('contact.read'));

drop policy if exists "Admins can read audit logs" on public.audit_logs;
drop policy if exists "Admins can write audit logs" on public.audit_logs;
create policy "Authorized users can read audit logs" on public.audit_logs for select to authenticated
  using (private.has_permission('audit.read'));
create policy "Authorized users can write audit logs" on public.audit_logs for insert to authenticated
  with check (private.has_permission('audit.write') and actor_id = (select auth.uid()));

drop policy if exists "Authorized users can read security events" on public.security_events;
drop policy if exists "Authorized users can write security events" on public.security_events;
create policy "Authorized users can read security events" on public.security_events for select to authenticated
  using (private.has_permission('security.read'));
create policy "Authorized users can write security events" on public.security_events for insert to authenticated
  with check (private.has_permission('audit.write') and actor_id = (select auth.uid()));

drop policy if exists "Admins can upload listing images" on storage.objects;
drop policy if exists "Admins can update listing images" on storage.objects;
drop policy if exists "Admins can delete listing images" on storage.objects;
create policy "Authorized users can upload listing images" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and private.has_permission('media.manage'));
create policy "Authorized users can update listing images" on storage.objects for update to authenticated
  using (bucket_id = 'listing-images' and private.has_permission('media.manage'))
  with check (bucket_id = 'listing-images' and private.has_permission('media.manage'));
create policy "Authorized users can delete listing images" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and private.has_permission('media.manage'));

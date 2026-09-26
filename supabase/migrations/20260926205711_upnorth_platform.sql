-- UpNorth.org platform foundation: auth profiles, claims, moderation, audit logs,
-- and least-privilege policies. This migration is safe to re-run.

create table if not exists public.towns (
  slug text primary key,
  name text not null,
  image text not null,
  intro text not null,
  nearest_lakes text not null,
  known_for text not null,
  nearest_large_town text not null,
  nearby text[] not null default '{}',
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id text primary key,
  slug text unique not null,
  name text not null,
  category text not null check (category in ('stay', 'eat-drink', 'things-to-do', 'real-estate')),
  subtype text not null,
  town text not null references public.towns(slug),
  price_range text,
  tags text[] not null default '{}',
  description text not null,
  images text[] not null default '{}',
  is_featured boolean not null default false,
  is_enhanced boolean not null default false,
  phone text,
  website text,
  address text,
  status text not null default 'published' check (status in ('draft', 'pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key,
  date text not null,
  date_sort date,
  title text not null,
  venue text not null,
  town text not null references public.towns(slug),
  image text not null,
  type text not null,
  description text not null,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'business_owner' check (role in ('admin', 'editor', 'business_owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_submissions (
  id text primary key,
  listing_id text,
  submission_type text not null default 'new' check (submission_type in ('new', 'claim')),
  submitted_by uuid references auth.users(id) on delete set null,
  business_name text not null,
  contact_email text,
  category text not null,
  subtype text not null,
  town text not null references public.towns(slug),
  address text,
  phone text,
  website text,
  description text not null,
  tier text not null default 'free' check (tier in ('free', 'enhanced', 'featured')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_claims (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  contact_email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  email text primary key check (position('@' in email) > 1),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id text primary key,
  name text not null,
  email text not null,
  topic text not null default 'general',
  town text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.business_submissions add column if not exists submitted_by uuid references auth.users(id) on delete set null;
alter table public.business_submissions add column if not exists contact_email text;
alter table public.business_submissions add column if not exists reviewer_notes text;
alter table public.business_submissions add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.business_submissions add column if not exists reviewed_at timestamptz;

create schema if not exists private;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'editor')
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

drop trigger if exists towns_set_updated_at on public.towns;
create trigger towns_set_updated_at before update on public.towns for each row execute function public.set_updated_at();
drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at before update on public.listings for each row execute function public.set_updated_at();
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

alter table public.towns enable row level security;
alter table public.listings enable row level security;
alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.business_submissions enable row level security;
alter table public.listing_claims enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;
alter table public.audit_logs enable row level security;

grant select on public.towns, public.listings, public.events to anon, authenticated;
grant select, insert, update on public.business_submissions, public.listing_claims to authenticated;
grant insert on public.business_submissions, public.newsletter_subscribers, public.contact_messages to anon, authenticated;
grant select on public.newsletter_subscribers, public.contact_messages, public.audit_logs to authenticated;
grant insert on public.audit_logs to authenticated;
grant select, update, insert, delete on public.towns, public.listings, public.events to authenticated;
grant select, update on public.profiles to authenticated;

drop policy if exists "Public can read published towns" on public.towns;
create policy "Public can read published towns" on public.towns for select to anon, authenticated using (status = 'published');
drop policy if exists "Admins can manage towns" on public.towns;
create policy "Admins can manage towns" on public.towns for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Public can read published listings" on public.listings;
create policy "Public can read published listings" on public.listings for select to anon, authenticated using (status = 'published');
drop policy if exists "Admins can manage listings" on public.listings;
create policy "Admins can manage listings" on public.listings for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Public can read published events" on public.events;
create policy "Public can read published events" on public.events for select to anon, authenticated using (status = 'published');
drop policy if exists "Admins can manage events" on public.events;
create policy "Admins can manage events" on public.events for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile" on public.profiles for select to authenticated using ((select auth.uid()) = id or private.is_admin());
drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles" on public.profiles for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Public can submit business listings" on public.business_submissions;
create policy "Public can submit business listings" on public.business_submissions for insert to anon, authenticated with check (status = 'pending');
drop policy if exists "Submitters can read their submissions" on public.business_submissions;
create policy "Submitters can read their submissions" on public.business_submissions for select to authenticated using ((select auth.uid()) = submitted_by or private.is_admin());
drop policy if exists "Admins can review submissions" on public.business_submissions;
create policy "Admins can review submissions" on public.business_submissions for update to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Users can submit claims" on public.listing_claims;
create policy "Users can submit claims" on public.listing_claims for insert to authenticated with check ((select auth.uid()) = submitted_by and status = 'pending');
drop policy if exists "Claimants can read their claims" on public.listing_claims;
create policy "Claimants can read their claims" on public.listing_claims for select to authenticated using ((select auth.uid()) = submitted_by or private.is_admin());
drop policy if exists "Admins can review claims" on public.listing_claims;
create policy "Admins can review claims" on public.listing_claims for update to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Public can subscribe" on public.newsletter_subscribers;
create policy "Public can subscribe" on public.newsletter_subscribers for insert to anon, authenticated with check (true);
drop policy if exists "Admins can read subscribers" on public.newsletter_subscribers;
create policy "Admins can read subscribers" on public.newsletter_subscribers for select to authenticated using (private.is_admin());

drop policy if exists "Public can send contact messages" on public.contact_messages;
create policy "Public can send contact messages" on public.contact_messages for insert to anon, authenticated with check (true);
drop policy if exists "Admins can read contact messages" on public.contact_messages;
create policy "Admins can read contact messages" on public.contact_messages for select to authenticated using (private.is_admin());

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs" on public.audit_logs for select to authenticated using (private.is_admin());
drop policy if exists "Admins can write audit logs" on public.audit_logs;
create policy "Admins can write audit logs" on public.audit_logs for insert to authenticated with check (private.is_admin() and actor_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read listing images" on storage.objects;
create policy "Public can read listing images" on storage.objects for select to anon, authenticated using (bucket_id = 'listing-images');
drop policy if exists "Admins can upload listing images" on storage.objects;
create policy "Admins can upload listing images" on storage.objects for insert to authenticated with check (bucket_id = 'listing-images' and private.is_admin());
drop policy if exists "Admins can update listing images" on storage.objects;
create policy "Admins can update listing images" on storage.objects for update to authenticated using (bucket_id = 'listing-images' and private.is_admin()) with check (bucket_id = 'listing-images' and private.is_admin());
drop policy if exists "Admins can delete listing images" on storage.objects;
create policy "Admins can delete listing images" on storage.objects for delete to authenticated using (bucket_id = 'listing-images' and private.is_admin());

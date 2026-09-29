-- Additive admin content controls for UpNorth.org.
-- Run after 20260928120000_secure_admin_panel.sql.
-- This migration does not drop, reset, or rewrite existing application tables.

create table if not exists public.admin_articles (
  id text primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  body text not null,
  hero_image text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  seo_title text,
  seo_description text,
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_categories (
  id text primary key,
  slug text unique not null,
  name text not null,
  kind text not null check (kind in ('listing', 'place', 'real-estate')),
  description text,
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_settings (
  id boolean primary key default true check (id = true),
  enabled boolean not null default true,
  model text,
  system_prompt text,
  monthly_limit integer not null default 0 check (monthly_limit >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('active', 'suspended'));

insert into public.admin_permissions (key, description) values
  ('categories.manage', 'Manage listing, place, and real-estate taxonomy'),
  ('articles.manage', 'Create and publish articles'),
  ('newsletter.send', 'Send newsletter messages'),
  ('users.manage', 'Invite, suspend, and revoke user sessions'),
  ('ai.update', 'Update non-secret AI settings')
on conflict (key) do update set description = excluded.description;

insert into public.admin_role_permissions (role, permission_key) values
  ('super_admin', 'categories.manage'), ('super_admin', 'articles.manage'), ('super_admin', 'newsletter.send'),
  ('super_admin', 'users.manage'), ('super_admin', 'ai.update'),
  ('admin', 'categories.manage'), ('admin', 'articles.manage'), ('admin', 'newsletter.send'),
  ('editor', 'categories.manage'), ('editor', 'articles.manage')
on conflict do nothing;

drop trigger if exists admin_articles_set_updated_at on public.admin_articles;
create trigger admin_articles_set_updated_at before update on public.admin_articles for each row execute function public.set_updated_at();
drop trigger if exists admin_categories_set_updated_at on public.admin_categories;
create trigger admin_categories_set_updated_at before update on public.admin_categories for each row execute function public.set_updated_at();

alter table public.admin_articles enable row level security;
alter table public.admin_categories enable row level security;
alter table public.site_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.ai_settings enable row level security;

grant select on public.admin_articles, public.admin_categories to anon, authenticated;
grant select, insert, update, delete on public.admin_articles, public.admin_categories to authenticated;
grant select, insert, update on public.site_settings, public.feature_flags, public.ai_settings to authenticated;

drop policy if exists "Public can read published articles" on public.admin_articles;
create policy "Public can read published articles" on public.admin_articles for select to anon, authenticated using (status = 'published');
drop policy if exists "Authorized users can read all articles" on public.admin_articles;
create policy "Authorized users can read all articles" on public.admin_articles for select to authenticated using (status = 'published' or private.has_permission('articles.manage'));
drop policy if exists "Authorized users can manage articles" on public.admin_articles;
create policy "Authorized users can manage articles" on public.admin_articles for all to authenticated using (private.has_permission('articles.manage')) with check (private.has_permission('articles.manage'));

drop policy if exists "Public can read published categories" on public.admin_categories;
create policy "Public can read published categories" on public.admin_categories for select to anon, authenticated using (status = 'published');
drop policy if exists "Authorized users can manage categories" on public.admin_categories;
create policy "Authorized users can manage categories" on public.admin_categories for all to authenticated using (private.has_permission('categories.manage')) with check (private.has_permission('categories.manage'));

drop policy if exists "Authorized users can read settings" on public.site_settings;
create policy "Authorized users can read settings" on public.site_settings for select to authenticated using (private.has_permission('settings.read'));
drop policy if exists "Authorized users can update settings" on public.site_settings;
create policy "Authorized users can update settings" on public.site_settings for insert to authenticated with check (private.has_permission('settings.update') and updated_by = (select auth.uid()));
create policy "Authorized users can update existing settings" on public.site_settings for update to authenticated using (private.has_permission('settings.update')) with check (private.has_permission('settings.update') and updated_by = (select auth.uid()));

drop policy if exists "Authorized users can read feature flags" on public.feature_flags;
create policy "Authorized users can read feature flags" on public.feature_flags for select to authenticated using (private.has_permission('settings.read'));
drop policy if exists "Authorized users can manage feature flags" on public.feature_flags;
create policy "Authorized users can manage feature flags" on public.feature_flags for all to authenticated using (private.has_permission('settings.update')) with check (private.has_permission('settings.update') and updated_by = (select auth.uid()));

drop policy if exists "Authorized users can read AI settings" on public.ai_settings;
create policy "Authorized users can read AI settings" on public.ai_settings for select to authenticated using (private.has_permission('ai.read'));
drop policy if exists "Authorized users can update AI settings" on public.ai_settings;
create policy "Authorized users can update AI settings" on public.ai_settings for insert to authenticated with check (private.has_permission('ai.update') and updated_by = (select auth.uid()));
create policy "Authorized users can update existing AI settings" on public.ai_settings for update to authenticated using (private.has_permission('ai.update')) with check (private.has_permission('ai.update') and updated_by = (select auth.uid()));

create index if not exists admin_articles_status_created_idx on public.admin_articles(status, created_at desc);
create index if not exists admin_categories_kind_sort_idx on public.admin_categories(kind, sort_order);

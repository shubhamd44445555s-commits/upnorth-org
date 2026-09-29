-- Append-only administrator change history for UpNorth.org.
-- Run after 20260929130000_admin_content_controls.sql.
-- This migration is additive and does not alter or drop existing data.

create table if not exists public.admin_change_history (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  changed_fields text[] not null default '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.admin_change_history enable row level security;
grant select, insert on public.admin_change_history to authenticated;

drop policy if exists "Authorized users can read change history" on public.admin_change_history;
create policy "Authorized users can read change history" on public.admin_change_history
  for select to authenticated
  using (private.has_permission('audit.read'));

drop policy if exists "Authorized users can write change history" on public.admin_change_history;
create policy "Authorized users can write change history" on public.admin_change_history
  for insert to authenticated
  with check (private.has_permission('audit.write') and actor_id = (select auth.uid()));

create index if not exists admin_change_history_created_idx on public.admin_change_history(created_at desc);
create index if not exists admin_change_history_entity_idx on public.admin_change_history(entity_type, entity_id, created_at desc);

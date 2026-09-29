-- Allow the public website to read only explicitly published CMS settings.
-- Admin writes remain protected by the existing settings.update policy.

grant select on public.site_settings to anon;

insert into public.admin_permissions (key, description)
values ('site_content.update', 'Edit approved public site content, design tokens, images, and layout')
on conflict (key) do update set description = excluded.description;

insert into public.admin_role_permissions (role, permission_key)
values ('admin', 'site_content.update')
on conflict do nothing;

drop policy if exists "Authorized users can insert public CMS settings" on public.site_settings;
create policy "Authorized users can insert public CMS settings"
  on public.site_settings for insert to authenticated
  with check (
    private.has_permission('site_content.update')
    and updated_by = (select auth.uid())
    and (key like 'content.%' or key like 'images.%' or key like 'design.%' or key like 'layout.%')
  );

drop policy if exists "Authorized users can update public CMS settings" on public.site_settings;
create policy "Authorized users can update public CMS settings"
  on public.site_settings for update to authenticated
  using (
    private.has_permission('site_content.update')
    and (key like 'content.%' or key like 'images.%' or key like 'design.%' or key like 'layout.%')
  )
  with check (
    private.has_permission('site_content.update')
    and updated_by = (select auth.uid())
    and (key like 'content.%' or key like 'images.%' or key like 'design.%' or key like 'layout.%')
  );

drop policy if exists "Public can read published site settings" on public.site_settings;
create policy "Public can read published site settings"
  on public.site_settings for select
  to anon, authenticated
  using (is_public = true);

-- Client-provided Northwoods imagery and logo defaults.
-- Additive and reversible: existing non-Unsplash custom assignments are preserved.
insert into public.site_settings (key, value, is_public)
values
  ('images.home.hero', to_jsonb('/assets/upnorth-hero-autumn-lake.jpg'::text), true),
  ('images.home.life', to_jsonb('/assets/upnorth-life-autumn-woods.jpg'::text), true),
  ('images.home.discovery_1', to_jsonb('/assets/upnorth-outdoors-river.jpg'::text), true),
  ('images.brand.logo_dark', to_jsonb('/upnorth-logo-mark.png'::text), true),
  ('images.brand.logo_light', to_jsonb('/upnorth-logo-mark.png'::text), true),
  ('images.brand.favicon', to_jsonb('/upnorth-logo-mark.png'::text), true)
on conflict (key) do update
set value = excluded.value,
    is_public = true,
    updated_at = now()
where coalesce(public.site_settings.value #>> '{}', '') = ''
   or public.site_settings.value #>> '{}' ilike '%unsplash%';

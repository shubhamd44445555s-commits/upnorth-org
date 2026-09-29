# UpNorth.org Supabase Setup

The app now uses Supabase for published content, newsletter signups, contact messages, business submissions, claims, admin profiles, audit logs, and listing image storage.

## Current provisioning status — 27 September 2026

- Project: `upnorth-production` (`dkolvtfxgvgmrevjndlq`)
- Migration: `supabase/migrations/20260926205711_upnorth_platform.sql` applied
- Seed data: `supabase/seed.sql` applied for the initial towns, listings, and events
- RLS/security: enabled; the Supabase security advisor returned no lints after the admin helper fix
- Auth/admin: first admin profile provisioned; `/login` and `/admin` are available
- Deployment: Vercel is live, but the project environment variables still need to be copied into Vercel before the hosted app can use the same Supabase-backed behavior as local development
- Secure admin migration: `supabase/migrations/20260928120000_secure_admin_panel.sql` added to the repository; apply it once in Supabase SQL Editor before using granular roles and security-event feeds

## Environment variables

Set these in local `.env.local` and in the Vercel project settings:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

For server-side Vercel functions, the `VITE_` names also work. Prefer these aliases when adding server-only values:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable or commit `.env.local`.

## Create the first admin

1. In Supabase Dashboard, open Authentication → Users.
2. Create an email/password user for the site owner.
3. Copy that user’s UUID.
4. In SQL Editor, run:

```sql
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where id = 'PASTE_USER_UUID_HERE'
on conflict (id) do update
set email = excluded.email, role = 'admin';
```

5. Open `/login` on the website and sign in with that Auth user.

The dashboard is available at `/admin`. Only `admin` and `editor` roles can access it. Authorization is based on the `profiles.role` column and RLS, not editable user metadata.

The first admin user has already been created for this project. Use the SQL above only when provisioning a new admin or recovering a role; do not create duplicate profiles manually.

## What the dashboard manages

- Pending business submissions: approve creates a published listing; reject records the decision.
- Claim requests: approve publishes the claimed listing; reject records the decision.
- Listing visibility, Featured, and Enhanced flags.
- Event publish/unpublish status.
- Audit log entries for moderation actions.
- Site Content & Design: approved homepage text, nav/footer labels, image assignments, allowlisted theme tokens, and homepage section order/visibility. This is a separate `site_content.update` permission and does not grant billing, secrets, or AI-provider access.

## Image storage

The migration creates a public-read `listing-images` bucket. Only admin/editor users can upload, update, or delete objects through Supabase Storage policies. The current public cards continue to use the listing image URLs and retain their frontend fallback image.

## Optional newsletter provider

The server adapter persists every subscriber to `newsletter_subscribers`. To also sync to a provider, set:

```env
NEWSLETTER_PROVIDER=brevo
NEWSLETTER_API_KEY=
BREVO_LIST_ID=
```

or:

```env
NEWSLETTER_PROVIDER=mailchimp
NEWSLETTER_API_KEY=
MAILCHIMP_AUDIENCE_ID=
MAILCHIMP_SERVER_PREFIX=
```

## Migrations

The generated migrations are:

- `supabase/migrations/20260926205711_upnorth_platform.sql` — core platform tables and RLS.
- `supabase/migrations/20260928120000_secure_admin_panel.sql` — secure admin roles, permissions, audit/security records.
- `supabase/migrations/20260929130000_admin_content_controls.sql` — articles, categories, settings, AI metadata, and admin controls.
- `supabase/migrations/20260929160000_public_site_settings.sql` — public read policy for explicitly published site settings and the narrow `site_content.update` permission.
- `supabase/migrations/20260929170000_admin_change_history.sql` — append-only before/after snapshots for administrator changes, protected by audit permissions.

Run them in timestamp order. The last two migrations are required for the public website to read CMS settings, for an `admin` role to save Site Content & Design changes, and for the Change history panel to display saved revisions.

## Deployment checklist

In the Vercel project, add the same non-secret Supabase URL and publishable key used locally, then redeploy. Keep any service-role key server-only and never use a `VITE_` prefix for it. After redeploying, check `/`, `/towns/minocqua`, `/listing/<slug>`, `/login`, and `/admin` while signed out and signed in.

The current map implementation is Leaflet/OpenStreetMap, so no Google Maps API key is needed for this version.

## Secure admin roles

The secure admin panel supports `super_admin`, `admin`, `editor`, `moderator`, `business_manager`, `viewer`, and `business_owner`. Roles are read from `profiles` and enforced by `/api/admin` plus RLS. The browser must never be used to grant a role. Only `super_admin` can manage administrator roles, and self-role changes are blocked.

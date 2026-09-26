# UpNorth.org Supabase Setup

The app now uses Supabase for published content, newsletter signups, contact messages, business submissions, claims, admin profiles, audit logs, and listing image storage.

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

## What the dashboard manages

- Pending business submissions: approve creates a published listing; reject records the decision.
- Claim requests: approve publishes the claimed listing; reject records the decision.
- Listing visibility, Featured, and Enhanced flags.
- Event publish/unpublish status.
- Audit log entries for moderation actions.

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

The generated migration is in `supabase/migrations/20260926205711_upnorth_platform.sql`. It contains the tables, RLS policies, private admin helper, audit log, and Storage policies.

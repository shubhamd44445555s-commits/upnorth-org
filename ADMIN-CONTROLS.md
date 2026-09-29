# UpNorth.org admin controls

The secure admin workspace is available at `/admin` after Supabase email/password sign-in. It keeps the public UpNorth design separate from operations and uses the signed-in Supabase access token for every admin request.

## Controls included

- Businesses: create, edit, publish/draft, feature, enhance, delete; real-estate records use the same listing workflow with the Real Estate category.
- Towns: create, edit, publish/draft, hero image and quick facts, guarded delete.
- Events: publish/unpublish.
- Submissions and claims: approve/reject with audit logging.
- Media: image upload/delete through the `listing-images` Supabase Storage bucket, with a 5 MB image limit in the UI.
- Newsletter: subscriber list, safe CSV export, and a Resend plain-text broadcast adapter.
- Contact messages: read-only operations inbox.
- Articles/CMS: draft/published editorial articles with SEO fields.
- Categories/places: taxonomy records for listing, place, and real-estate categories.
- Site settings and feature flags: non-secret configuration only.
- AI settings: non-secret model, prompt, enable/disable, and usage-limit metadata.
- Users: super-admin-only role changes, invite, suspension/reactivation, and global session revocation when the private Supabase service-role key is configured.
- Audit and security event logs.

Stripe and pricing controls are intentionally not exposed until client approval.

## Required migration

Run `supabase/migrations/20260929130000_admin_content_controls.sql` in the Supabase SQL Editor after the secure admin migration. Do not deploy the new admin bundle before this migration is applied: the panel intentionally fails closed if the `profiles.status` security column or new protected admin tables are missing.

## Provider configuration

The following must stay server-only in Vercel Environment Variables:

- `SUPABASE_SERVICE_ROLE_KEY` — required only for invite and global session revocation.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` — required for newsletter sending; the sender domain must be verified in Resend.

The service-role key is never imported by browser code, returned by an API response, or placed in a `VITE_` variable.

## Security boundary

The UI only hides unavailable actions for usability. `/api/admin` independently verifies the Supabase token, profile status, role permission, origin, payload shape, rate limit, RLS result, and audit trail. Client-submitted roles and flags are not trusted for authorization. Destructive actions require an explicit UI confirmation and server-side permission.

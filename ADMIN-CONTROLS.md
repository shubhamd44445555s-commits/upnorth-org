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
- Site Content & Design: homepage hero/section text, navigation/footer labels, approved image URLs, allowlisted colors/fonts/spacing, and homepage section visibility/order. Changes are saved as public JSON values only; arbitrary HTML/CSS/scripts are not accepted.
- Feature flags: non-secret configuration only.
- AI settings: non-secret model, prompt, enable/disable, and usage-limit metadata.
- Users: super-admin-only role changes, invite, suspension/reactivation, and global session revocation when the private Supabase service-role key is configured.
- Audit and security event logs.

Stripe and pricing controls are intentionally not exposed until client approval.

## Required migration

Run these migrations in the Supabase SQL Editor in order:

1. `supabase/migrations/20260929130000_admin_content_controls.sql`
2. `supabase/migrations/20260929160000_public_site_settings.sql`

The second migration adds public read access only for rows marked `is_public = true` and creates the narrow `site_content.update` permission for the `admin` role. The browser cannot write settings directly; the server action validates the allowlisted content, image, design, and layout values.

## Provider configuration

The following must stay server-only in Vercel Environment Variables:

- `SUPABASE_SERVICE_ROLE_KEY` — required only for invite and global session revocation.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` — required for newsletter sending; the sender domain must be verified in Resend.

The service-role key is never imported by browser code, returned by an API response, or placed in a `VITE_` variable.

## Security boundary

The UI only hides unavailable actions for usability. `/api/admin` independently verifies the Supabase token, profile status, role permission, origin, payload shape, rate limit, RLS result, and audit trail. Client-submitted roles and flags are not trusted for authorization. Destructive actions require an explicit UI confirmation and server-side permission.

## Public CMS behavior

The public app keeps the existing UpNorth design as its fallback. Once the public-settings migration is applied, it reads published `site_settings` rows through the Supabase publishable key. The home page can render the known section blocks in the saved order, and published `admin_articles` appear on the home page when available and at `/articles` / `/articles/:slug`. Article bodies render as plain text paragraphs; arbitrary HTML is not rendered.

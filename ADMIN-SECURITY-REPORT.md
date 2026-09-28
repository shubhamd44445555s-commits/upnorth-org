# UpNorth.org — Secure Master Admin Panel Report

## Existing architecture inspected

- React/Vite single-page frontend with route selection in `src/part3-entry.jsx`.
- Existing `/login` and `/admin` route pair preserved.
- Supabase Auth is used for email/password sign-in; the browser uses the publishable key only.
- Supabase Postgres, RLS, Storage and the existing moderation tables were already present.
- Vercel root serverless functions are used for `/api/ask`, `/api/subscribe`, and now `/api/admin`.
- Existing listing, town, event, submission, claim, and public route behavior was preserved.

## Files added

- `api/_admin-security.js` — server-side action allowlist, role/permission map, and input validation.
- `api/admin.js` — authenticated Vercel admin API with authorization, rate limiting, audit/security logging, and business workflows.
- `src/admin-panel-secure.jsx` — additive secure admin UI with overview, moderation, listings, events, users, audit, and security views.
- `src/lib/admin-api.js` — authenticated same-origin client adapter for `/api/admin`.
- `scripts/test-admin-security.mjs` — authorization and payload-boundary tests.
- `supabase/migrations/20260928120000_secure_admin_panel.sql` — additive roles, permissions, security events, audit fields, and RLS policies.

## Files modified

- `src/part3-entry.jsx` — routes `/login` and `/admin` to the secure panel entry.
- `src/lib/admin-data.js` — moves admin reads and writes through the authenticated server API.
- `src/lib/auth.js` — recognizes the full authorized role set without trusting client state for enforcement.
- `src/styles.admin.css` — adds the professional sidebar, dashboard statistics, logs, users, security and responsive styles.
- `vercel.json` — adds compatible security response headers while preserving Vite output and SPA rewrites.
- `package.json` — adds `npm run test:security`.

The old `src/admin-panel.jsx` file remains untouched as a compatibility artifact; the route no longer imports it. No public-facing route was deleted or rewritten.

## Database changes

The new migration is additive and does not drop, truncate, or reset production tables. It adds:

- `admin_permissions`
- `admin_role_permissions`
- `security_events`
- `ip_address`, `user_agent`, and `success` fields to `audit_logs`
- Supporting indexes
- Permission-aware `private.has_permission(text)` and compatibility `private.is_admin()` functions

Roles supported: `super_admin`, `admin`, `editor`, `moderator`, `business_manager`, `viewer`, and `business_owner`.

The migration tightens policies for listings, towns, events, profiles, submissions, claims, newsletter records, contact messages, audit logs, security events, and listing image storage. It must be run once in the Supabase SQL editor before the new permission model is active remotely.

## Authentication

Admin authentication remains Supabase Auth email/password authentication. The application never stores passwords and never creates a master password or hidden bypass. The browser obtains the current Supabase session, then sends its short-lived access token over a same-origin HTTPS request to `/api/admin`. The API verifies the token with `auth.getUser()` before reading the trusted profile role.

## Authorization

The browser may hide navigation items for usability, but it is not the security boundary. `/api/admin` independently validates the action, loads the role from the `profiles` table, checks the server-side permission map, validates the request payload, and performs the operation using the caller's authenticated Supabase context. Supabase RLS is the final database authorization layer.

Only `super_admin` receives `admins.manage`. Self-role changes are blocked in both the API and the profile update RLS policy. A request body cannot grant itself a role or permission because role fields are ignored except for the dedicated, permission-protected role-management action.

## Security controls

- No backdoor, master password, hard-coded credentials, or secret URL.
- No service-role key in client code; the admin API uses the publishable key plus the authenticated user's bearer token.
- Same-origin check for browser-originated admin requests.
- Server-side action allowlist and field-level input validation.
- Server-side role/permission checks for every admin action.
- Supabase RLS on existing and new administrative tables.
- Least-privilege role mappings.
- Best-effort per-user/action rate limit at the Vercel function boundary.
- Append-oriented audit logging for moderation, listing, event, and role changes.
- Security-event logging with bounded IP/user-agent metadata and no credentials/tokens.
- Security response headers: `nosniff`, `SAMEORIGIN`, strict referrer policy, permissions policy, and HSTS.
- React escaping is retained for user-submitted text; no arbitrary HTML rendering was introduced.
- Error responses avoid stack traces, SQL, tokens, API keys, and filesystem paths.

## Tests performed

- `npm run test:security` — permission separation, action allowlist, mass-assignment rejection, invalid-role rejection, invalid-ID rejection, server auth/authorization guard presence, same-origin guard presence, and service-role-key absence in the admin API.
- `node --check api/admin.js`
- `node --check api/_admin-security.js`
- `node --check scripts/test-admin-security.mjs`
- `npm run build` — passed.
- `git diff --check` — passed.
- Existing public build and route architecture preserved.

## Known limitations

- The additive migration file is created but must still be applied in the remote Supabase SQL editor; the Supabase CLI is not installed in this workspace.
- MFA/TOTP, password reset UX, active-session inventory, and “sign out all other sessions” are not claimed as implemented; these require Supabase Auth/provider configuration and a deliberate session-management design.
- The in-memory rate limiter is per serverless instance and is not a distributed production limiter.
- Failed login events cannot be reliably captured by the current direct Supabase Auth browser flow; successful admin operations are auditable.
- The current panel covers moderation, listing/event visibility, users/roles, audit and security feeds. Full CMS modules for articles, categories, real-estate editing, media metadata, AI settings, site settings and feature flags remain staged extensions.
- Production Vercel environment variables, final content, real images, email verification, Stripe, analytics, monitoring, legal pages and custom-domain configuration remain separate launch work.

## Deployment requirements

Required Vercel variables for the current admin API:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The frontend uses the `VITE_` pair; `/api/admin` can use either the server aliases or the `VITE_` pair. No `SUPABASE_SERVICE_ROLE_KEY` is required for this design and it must not be exposed to the browser.

Apply `supabase/migrations/20260928120000_secure_admin_panel.sql`, redeploy, then verify `/login`, `/admin`, one allowed action, one denied role action, the audit feed, and the security feed.

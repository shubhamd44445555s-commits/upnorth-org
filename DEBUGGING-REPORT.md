# UpNorth.org — Complete Debugging & Security Verification Report

**Prepared:** 29 September 2026  
**Project:** UpNorth.org  
**Testing domain:** https://glent.xyz  
**Repository:** https://github.com/shubhamd44445555s-commits/upnorth-org  
**Latest verified commit:** `49ed6fd`

## 1. Executive summary

The UpNorth.org application was audited after the Site Content & Design CMS, media-slot assignment, and secure admin panel work. The existing public design and functionality were preserved.

The audit found and corrected two real issues:

1. One remote Unsplash image returned HTTP 404 and was used by fishing listings and a homepage weekend card. It was replaced with a verified image asset.
2. Malformed requests to `/api/admin` returned HTTP 500. They now return HTTP 400, while unauthenticated valid admin actions correctly return HTTP 401.

An additional defense-in-depth improvement was added for CMS image URLs: only valid HTTPS URLs are accepted server-side and unsafe values fall back to the default image on the public site.

## 2. Verification performed

| Area | Result | Evidence |
|---|---|---|
| Production build | Passed | `npm run build` completed successfully |
| Admin security tests | Passed | `npm run test:security` |
| Dependency audit | Passed | `npm audit --audit-level=high` reported 0 vulnerabilities |
| Server syntax | Passed | API, library, and utility JavaScript syntax checks |
| Remote image audit | Passed | 45 unique image URLs checked; 0 broken URLs after fix |
| Browser smoke test | Passed | No JavaScript errors on tested routes |
| Live route smoke test | Passed | Core routes on `glent.xyz` returned HTTP 200 |
| Admin API malformed request | Passed | Empty POST returned HTTP 400 |
| Admin API unauthenticated boundary | Passed | Valid overview action without auth returned HTTP 401 |
| Ask API method boundary | Passed | GET `/api/ask` returned HTTP 405 |
| Git working tree | Passed | Clean after final commit |

## 3. Routes smoke-tested

The following public and protected entry routes were checked:

- `/`
- `/about`
- `/contact`
- `/things-to-do`
- `/stay`
- `/eat-drink`
- `/events`
- `/real-estate`
- `/towns/minocqua`
- `/listing/pine-shadow-cabins`
- `/articles`
- `/login`
- `/admin`
- `/pricing`
- `/list-your-business`

The public routes rendered their expected headings. The protected `/admin` route showed the login boundary when no session was present.

## 4. Issues fixed

### 4.1 Broken remote image

The image URL for `photo-1534943441045-1009d7cbf97c` returned HTTP 404. It appeared in the fishing listing data and homepage weekend content.

**Fix:** replaced it with a verified Unsplash asset and rechecked all 45 unique image URLs.

### 4.2 Admin API error classification

An empty or invalid `/api/admin` request reached generic error handling and returned HTTP 500.

**Fix:** malformed requests now return HTTP 400. Valid requests without a Supabase access token continue to return HTTP 401. This avoids treating client input errors as server failures.

### 4.3 CMS image URL hardening

CMS image assignments now require valid HTTPS URLs. Unsafe values containing whitespace, quotes, angle brackets, invalid protocols, or malformed URL syntax are rejected server-side. The public loader also validates image URLs before using them in CSS backgrounds.

## 5. Security controls verified

- Supabase Auth is used for admin identity.
- Admin permissions are read from the trusted `profiles.role` and permission tables.
- The browser is not the security boundary.
- `/api/admin` independently checks authentication, role permission, request origin, rate limit, payload validation, database results, and audit logging.
- RLS remains enabled; no production table was dropped or reset.
- No master password, secret URL, backdoor, or hard-coded credential was added.
- Service-role credentials are not exposed to browser code.
- Public CMS values are limited to approved text, images, theme tokens, and known homepage sections.
- Article content renders as plain text; arbitrary HTML is not rendered.
- CMS image assignments use controlled Supabase Storage URLs.
- Sensitive administrative actions are recorded in audit/security logs where the existing schema supports them.
- Stripe and pricing controls remain intentionally locked until client approval.

## 6. Super Admin panel verification scope

Verified in code and UI structure:

- Dashboard and operational statistics
- Business/listing management
- Town management
- Event publish/unpublish controls
- Submission and business-claim moderation
- Media upload/delete
- Homepage media-slot assignment
- Site Content & Design CMS
- Articles and public guides
- Categories and taxonomy
- Newsletter subscriber export
- Contact-message inbox
- AI configuration metadata
- User roles and account status controls
- Audit logs and security events
- Integration/system status

## 7. Known limitations and items requiring production configuration

These were not treated as failures because they require client-owned external configuration:

- Resend sender domain and `RESEND_FROM_EMAIL` are not active until the client completes verification.
- Supabase service-role key is intentionally not configured; user invitation and global session revocation remain provider-dependent.
- Stripe and pricing are intentionally deferred until client approval.
- Final licensed or client-approved image assets still need to replace remote Unsplash assets for production use.
- Live Supabase content writes, media upload, and CMS publishing require the new Supabase public-settings migration to be applied.
- Local sandbox browser tests could not reach Supabase consistently; the application correctly used its existing fallback content. Live route checks on `glent.xyz` succeeded.
- Analytics, legal copy, production monitoring, backups, and final domain/provider ownership still require client decisions.

## 8. Required Supabase migration

Run this additive migration after the existing admin content migration:

`supabase/migrations/20260929160000_public_site_settings.sql`

It enables public read access only for `is_public = true` settings and adds the narrow `site_content.update` permission for approved CMS values.

## 9. Release history

- `15f9f1d` — homepage media-slot assignment
- `0ec5be6` — broken remote image correction
- `e938d6a` — safe admin API client-error handling
- `49ed6fd` — CMS image URL hardening

## 10. Final status

The application passed the available automated, browser, asset, security, dependency, and live route checks. The codebase is clean and the latest fixes are pushed to GitHub. Remaining work is configuration and client-owned production setup, not an unresolved code failure.

# UpNorth.org — QA and Release Checklist

## 1. Current QA status

The current implementation has passed a production build with `npm run build`. Functional browser QA covered public routes, Supabase-backed content reads, Leaflet maps, login/admin route states, the Ask flow, pricing modal, claim prefill, business submission confirmation, homepage Ask redirect, newsletter persistence, metadata, sitemap/robots responses, and mobile overflow checks.

The project is deployed for client review at [upnorth-org-preview.vercel.app](https://upnorth-org-preview.vercel.app) and the `glent.xyz` testing custom domain also returns HTTP 200 over HTTPS. Supabase schema/RLS/Auth/admin workflows are connected. The project is not yet fully production-ready because Vercel environment variables, final image assets, Stripe, email provider activation, legal, analytics, and monitoring remain.

## 2. Verified demo journeys

| Journey | Result |
|---|---|
| Homepage loads | Passed |
| About page loads | Passed |
| Contact page loads | Passed |
| Contact form shows confirmation state | Passed |
| Homepage Ask action navigates to `/ask` | Passed |
| Ask prompt cards produce recommendation state | Passed |
| Pricing page shows three plans | Passed |
| Pricing checkout opens demo modal | Passed |
| Listing claim link carries the listing slug | Passed |
| Business submission shows confirmation state | Passed |
| Newsletter fallback stores/acknowledges signup | Passed |
| Newsletter toast displays success message | Passed |
| Sitemap response available | Passed |
| Robots response available | Passed |
| Mobile horizontal overflow check | Passed |
| Broken image fallback smoke check | Passed |
| Production build | Passed |
| Supabase REST content reads | Passed |
| Town and listing Leaflet map render | Passed |
| Admin login route render | Passed |
| Protected `/admin` redirect when signed out | Passed |
| Supabase security advisors | Passed — no lints |
| Groq API request from local environment | Passed — HTTP 200 with configured model |
| Vercel stable deployment | Passed — HTTP 200 and UpNorth content present |
| Vercel preview deployment | Passed — HTTP 200 and UpNorth content present |
| Vercel `glent.xyz` custom domain | Passed — HTTPS HTTP 200 and UpNorth content present |
| Resend/Dynadot DNS lookup for `glent.xyz` | Passed — required TXT/CNAME records visible |
| Resend domain verification | Pending — Resend still reports `pending` after DNS application |
| Secure admin payload/permission tests | Passed — `npm run test:security` |
| Admin API JavaScript syntax | Passed — `node --check` |

## 3. Client acceptance checklist

### Visual acceptance

- [ ] Client confirms the existing UpNorth design direction is preserved.
- [ ] Final logo and brand assets supplied.
- [ ] Final photography supplied or licensed.
- [ ] Typography and color values approved against brand source files.
- [ ] Desktop, tablet, and mobile layouts approved.

### Content acceptance

- [ ] Nine town introductions approved.
- [ ] Listing names, descriptions, addresses, phones, websites, hours, and prices verified.
- [ ] Event names and dates verified.
- [ ] Map labels and coverage verified.
- [ ] Newsletter wording and sender identity approved.
- [ ] Business submission and claim confirmation copy approved.

### Functional acceptance

- [ ] All intended routes are accessible from navigation or contextual links.
- [ ] Town and category filters return the expected records.
- [ ] Featured and enhanced sorting is approved.
- [ ] Load-more behavior is approved.
- [ ] Gallery/lightbox behavior is approved.
- [ ] Empty and invalid states are approved.
- [ ] Forms have spam protection and validation.

## 4. Production readiness checklist

- [x] Choose hosting platform and configure SPA rewrites — Vercel and `vercel.json`.
- [ ] Configure production environment secrets in Vercel.
- [x] Connect database foundation and migrate seed content — Supabase schema/RLS applied.
- [ ] Connect image storage/CDN and replace remote demo images.
- [ ] Connect Stripe checkout, subscriptions, and signed webhooks.
- [x] Connect AI provider through a server-side proxy — Groq `/api/ask` locally verified.
- [ ] Connect newsletter and transactional email providers.
- [x] Connect map provider — Leaflet/OpenStreetMap is active; Google Maps is not required.
- [x] Create admin review workflow for listings, claims, and events.
- [ ] Apply the additive secure admin migration in the remote Supabase project.
- [x] Add server-side admin API validation and role/permission checks.
- [x] Add audit/security views and self-escalation protections in code.
- [ ] Add analytics and conversion events.
- [ ] Add privacy policy, terms, cookie disclosure, and accessibility statement as required.
- [ ] Configure monitoring, error tracking, backups, and rollback procedure.
- [ ] Run final smoke test on the production domain.

## 5. Release gates

### Gate A — client review

Design, copy, routes, and demo interactions are reviewed and approved.

### Gate B — integration staging

Backend persistence, payments, email, AI, maps, media, and admin review are connected in a staging environment.

### Gate C — production launch

Security, privacy, analytics, content verification, domain, redirects, and rollback plan are signed off.

## 6. Known limitations

- Stripe pricing remains intentionally demo-only until client approval and Stripe keys/webhooks are configured.
- Newsletter provider sync remains optional; Supabase persistence is active.
- Leaflet/OpenStreetMap is active; Google Maps is not required for the current map implementation.
- Remote photos should be replaced or cleared for licensing and long-term reliability.
- Resend/Dynadot DNS is applied for `glent.xyz`, but Resend verification and sender activation are still pending.
- Vercel deployment and `glent.xyz` custom-domain attachment are complete, but Vercel runtime environment variables are not complete.
- The secure admin migration is present in the repository but is not confirmed as applied to the remote database yet.
- MFA/TOTP and active-session management are not implemented as production claims.
- Visual screenshot capture may depend on the local Windows browser/ACL environment, even though functional build and browser checks pass.

## 7. Sign-off

| Area | Approver | Date | Status |
|---|---|---|---|
| Product scope |  |  | Pending |
| Visual design |  |  | Pending |
| Content |  |  | Pending |
| Technical integration |  |  | Pending |
| Privacy and legal |  |  | Pending |
| Production launch |  |  | Pending |

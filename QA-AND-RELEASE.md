# UpNorth.org — QA and Release Checklist

## 1. Current QA status

The current implementation has passed a production build with `npm run build`. Functional browser QA covered public routes, Supabase-backed content reads, Leaflet maps, login/admin route states, the Ask flow, pricing modal, claim prefill, business submission confirmation, homepage Ask redirect, newsletter fallback, metadata, sitemap/robots responses, and mobile overflow checks.

The project is ready for client review. It should not be treated as fully production-ready until the external integrations and persistent backend are connected.

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

- [ ] Choose hosting platform and configure SPA rewrites.
- [ ] Configure production environment secrets.
- [ ] Connect database/CMS and migrate approved demo content.
- [ ] Connect image storage/CDN and replace remote demo images.
- [ ] Connect Stripe checkout, subscriptions, and signed webhooks.
- [ ] Connect AI provider through a server-side proxy.
- [ ] Connect newsletter and transactional email providers.
- [ ] Connect map provider and decide whether API key restrictions are required.
- [ ] Create admin review workflow for listings, claims, and events.
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

- Stripe pricing remains a demo until client approval and Stripe keys/webhooks are configured.
- Newsletter provider sync remains optional; Supabase persistence is active.
- Leaflet/OpenStreetMap is active; Google Maps is not required for the current map implementation.
- Remote photos should be replaced or cleared for licensing and long-term reliability.
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

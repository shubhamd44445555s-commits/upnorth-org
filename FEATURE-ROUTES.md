# UpNorth.org — Feature and Route Specification

## Current implementation status — 27 September 2026

The route set below is implemented with the existing UpNorth design system. Public content hydrates from Supabase when available and falls back to the bundled Northwoods data when necessary. The site is available for review at [upnorth-org-preview.vercel.app](https://upnorth-org-preview.vercel.app); the latest preview deployment is [available here](https://upnorth-org-preview-680gsfm04-shubhamd44445555s-9978s-projects.vercel.app).

## Route inventory

| Route | Purpose | Status |
|---|---|---|
| `/` | Homepage and regional discovery | Implemented |
| `/about` | UpNorth.org story, mission, and regional pillars | Implemented |
| `/contact` | Contact information and inquiry form | Implemented |
| `/towns/minocqua` | Town discovery page | Implemented |
| `/towns/eagle-river` | Town discovery page | Implemented |
| `/towns/boulder-junction` | Town discovery page | Implemented |
| `/towns/presque-isle` | Town discovery page | Implemented |
| `/towns/manitowish-waters` | Town discovery page | Implemented |
| `/towns/land-o-lakes` | Town discovery page | Implemented |
| `/towns/rhinelander` | Town discovery page | Implemented |
| `/towns/mercer` | Town discovery page | Implemented |
| `/towns/hurley-ironwood` | Town discovery page | Implemented |
| `/stay` | Places to stay directory | Implemented |
| `/eat-drink` | Food and drink directory | Implemented |
| `/things-to-do` | Activities directory | Implemented |
| `/events` | Events directory | Implemented |
| `/explore` | Exploration and regional inspiration | Implemented |
| `/real-estate` | Real-estate directory | Implemented |
| `/listing/[slug]` | Listing detail | Implemented |
| `/ask` | Ask Up North concierge | Implemented |
| `/pricing` | Business visibility plans | Implemented |
| `/list-your-business` | Submit or claim a listing | Implemented |
| `/login` | Supabase Auth admin login | Implemented |
| `/admin` | Protected master admin panel and moderation dashboard | Implemented foundation |

## Reusable UI patterns

### ListingCard

Displays image, name, town, category/subtype, star rating, and merchandising badge. Sorting is functional: featured first, enhanced second, free listings afterward.

### TownCard

Displays town image, name, and short regional tagline. Used in homepage and discovery sections.

### FilterBar

Controlled filter pattern for town and category-specific subtypes. It is reused across directory pages to keep interaction and visual treatment consistent.

### Breadcrumbs

Provides orientation on town, category, and listing pages.

### SectionHeader

Reusable heading treatment with optional “See all” link. Used across homepage, town pages, and directory sections.

## Town page behavior

Every town page should have:

1. A full-width town image and overlaid town name.
2. A concise town introduction.
3. Quick facts: nearest lakes, known-for statement, and nearest larger town.
4. Stay, Eat, Things to Do, and Upcoming Events sections.
5. Three to four relevant demo entries per section where data is available.
6. A responsive Leaflet/OpenStreetMap map with town marker.
7. Nearby town links.

## Category page behavior

Each category page should have:

1. Category-specific photo banner, title, and description.
2. Town filter covering the nine initial towns.
3. Category-specific filter options.
4. Responsive listing grid.
5. Featured/enhanced/free ordering.
6. Twelve-item load-more pagination behavior.

## Listing detail behavior

Listing detail pages should expose:

- Three to six gallery images where available.
- Name, category tag, town, address, phone, website, hours, and price range.
- Description and amenity chips.
- Leaflet/OpenStreetMap map centered on the listing town.
- `Claim this listing` action linking to `/list-your-business?claim=[slug]`.
- Nearby listings in the same town.

## Commercial visibility logic

| Tier | Sort position | Visual treatment | Intended meaning |
|---|---:|---|---|
| Featured | 1 | Amber badge | Paid priority placement |
| Enhanced | 2 | Subtle enhanced badge | Paid improved visibility |
| Free | 3 | No paid badge | Standard directory placement |

The current demo performs this ordering in the listing collection. Production billing must eventually update the underlying tier flags from a trusted backend.

## Operations behavior

- Supabase is the primary source for published towns, listings, and events, with local data fallback during development or an outage.
- `/login` uses Supabase email/password Auth.
- `/admin` is protected by the `profiles.role` value (`admin` or `editor`) and RLS.
- Business submissions and claims can be approved or rejected from the dashboard; approvals publish or update the listing and write an audit log.
- The `listing-images` Supabase Storage bucket is public-read and admin-write.

The secure admin foundation also provides role-aware views for overview statistics, users/roles, audit logs, and security events. The server-side `/api/admin` endpoint rechecks authentication, permissions, validation, and business rules for every action.

## Server/API behavior

| Endpoint | Purpose | Current status |
|---|---|---|
| `/api/ask` | Sends a bounded listing-candidate set to Groq and returns recommendation text/data | Implemented; local live-key test passed; Vercel environment variables still need configuration |
| `/api/subscribe` | Persists newsletter subscribers and optionally syncs Brevo/Mailchimp | Implemented; Supabase persistence active; provider sync optional |

The Vercel deployment uses the repository `vercel.json` SPA rewrite and root `api/` serverless functions. A plain local Vite server may use the frontend fallback because it does not execute Vercel functions automatically.

## External integration status

- Supabase schema, RLS, Auth, Storage, admin role, and moderation workflow: connected.
- Groq Ask integration: connected in the local environment; deployment variables still pending.
- Leaflet/OpenStreetMap maps: active; no Google Maps key required.
- Resend/Dynadot for `glent.xyz`: DNS records applied and publicly visible; Resend verification pending.
- Stripe pricing/payment: intentionally left as demo until client approval.
- Final image assets: intentionally not replaced yet; remote images and fallback handling remain.
- Custom-domain attachment, newsletter provider credentials, analytics, monitoring, and legal pages: pending launch hardening.

## Link and error expectations

- Navigation links should resolve to the listed routes.
- “See all” links should preserve the relevant category context.
- Claim links should carry the listing slug.
- Empty filter results should show a helpful empty state and a path back to broader results.
- Missing or invalid slugs should show a safe not-found state rather than a broken page.

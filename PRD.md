# UpNorth.org — Product Requirements Document

## 1. Executive summary

UpNorth.org is a regional discovery platform for Wisconsin Northwoods visitors, residents, and local businesses. It brings together towns, places to stay, food and drink, things to do, events, exploration resources, and real-estate discovery in one editorially curated experience.

The product is designed to help a visitor move from inspiration to a practical plan: discover a town, browse relevant listings, understand nearby options, ask for recommendations, and contact or claim a business listing.

## 1A. Current delivery status — 27 September 2026

The original UpNorth.org visual direction is implemented and preserved. The public React/Vite site is deployed for client review at [upnorth-org-preview.vercel.app](https://upnorth-org-preview.vercel.app), with the latest preview available at [the current Vercel preview](https://upnorth-org-preview-680gsfm04-shubhamd44445555s-9978s-projects.vercel.app).

Current production-shaped foundation:

- Supabase is connected for published towns, listings, events, contact messages, newsletter subscribers, submissions, claims, profiles, audit logs, and listing image storage.
- Supabase Auth and the protected `/admin` moderation dashboard are active; admin/editor access is enforced through profiles and RLS.
- `/api/ask` uses Groq server-side when configured and safely falls back to the local recommendation experience when the deployment has no AI environment variables.
- Leaflet/OpenStreetMap is the active map implementation, so Google Maps billing and API keys are not required for the current version.
- Vercel build configuration and SPA rewrites are present; deployment environment variables still need to be configured for full live Supabase/Groq behavior.
- Resend/Dynadot DNS setup for `glent.xyz` has been applied and DNS records are visible; Resend verification is still pending.

Intentionally deferred until client approval or final content approval: Stripe pricing/payment, real licensed image replacement, production newsletter/transactional email provider activation, custom-domain attachment, and final legal/analytics/monitoring setup.

## 2. Product vision

Make it easy to discover, plan, and remember time Up North — from a weekend getaway to a new place to live or do business.

## 3. Goals

- Present the Northwoods as a connected region rather than a collection of isolated businesses.
- Help users discover towns, stays, restaurants, activities, events, and real-estate options.
- Give local businesses a structured path to submit, claim, enhance, or feature a listing.
- Preserve the existing UpNorth.org visual identity: nature-led photography, warm editorial typography, forest-green accents, clear cards, and an approachable regional tone.
- Provide a strong demo foundation that can be connected to production services without redesigning the user experience.

## 4. Primary users

### Visitors and vacation planners

People looking for a cabin, resort, restaurant, activity, event, or town to visit.

### Local residents

People looking for nearby food, events, businesses, activities, and seasonal ideas.

### Property and relocation researchers

People exploring real estate, land, agents, and communities in the Northwoods.

### Local business owners

Business owners who want to submit a listing, claim an existing listing, or pay for enhanced visibility.

### Editorial and operations team

The future internal team responsible for reviewing submissions, maintaining listings, curating featured content, and managing paid visibility.

## 5. Core user journeys

### Discover a weekend

Homepage → search or category → town/listing results → listing detail → nearby listings or claim/contact action.

### Explore a town

Homepage → town card → dynamic town page → stay, eat, activities, and event sections → nearby town.

### Find a business

Category page → town and subtype filters → sorted listing grid → listing detail → website, phone, or address action.

### Ask for recommendations

Homepage or navigation → Ask Up North → select a prompt → receive a recommendation card → open the relevant town or listing.

### Submit or claim a listing

List Your Business → choose submission or claim flow → prefilled listing details when claiming → submit for review.

## 6. Implemented functional requirements

### Homepage

- Editorial hero image with “Life’s Better Up North” positioning.
- Search entry point for towns, lakes, activities, cabins, and events.
- Category shortcuts for Outdoors, Places to Stay, Eat & Drink, Events, Towns, and Real Estate.
- Discovery cards for outdoor experiences, stays, local food, and charming towns.
- Events and town discovery sections.
- Weekend highlights and featured business content.
- Newsletter signup persists to Supabase and shows a confirmation state; optional Brevo/Mailchimp synchronization remains configurable.
- Responsive layout for desktop and mobile widths.

### About and contact

- `/about` explains the UpNorth.org story, local perspective, and regional mission using the existing editorial visual language.
- `/contact` provides contact details, business/event context, and a responsive inquiry form that persists messages to Supabase and shows a confirmation state.

### Town discovery

Dynamic town pages are provided for:

Minocqua, Eagle River, Boulder Junction, Presque Isle, Manitowish Waters, Land O’ Lakes, Rhinelander, Mercer, and Hurley/Ironwood.

Each town page includes a photo header, town-specific welcome copy, quick facts, stay/eat/do/events sections, a map placeholder, and nearby towns.

### Category discovery

The following category routes are implemented:

`/stay`, `/eat-drink`, `/things-to-do`, `/events`, `/explore`, and `/real-estate`.

Each category supports a category banner, town filtering, category-specific filtering, responsive listing cards, featured/enhanced/free sort order, and load-more pagination.

### Listing details

Listing detail pages include a photo gallery/lightbox behavior, name, category, town, contact details, address, hours, price range, description, amenity chips, map placeholder, claim action, and nearby listings.

### Business tools

- `/list-your-business` submission flow.
- Claim links prefilled with the listing slug.
- Supabase-backed submission and claim requests with admin/editor review, approval, rejection, and audit-log behavior.
- `/pricing` page describing Free, Enhanced, and Featured visibility tiers.
- Demo checkout modal where Stripe has not yet been connected.

### Ask Up North

`/ask` provides prompt cards for common trip-planning questions and a recommendation response experience. The server adapter calls Groq with published listing candidates when configured, and the frontend retains a safe fallback when a deployment has no AI key.

### SEO and discoverability

- Page metadata and social preview foundations.
- Sitemap and robots routes/files.
- LocalBusiness structured-data foundation for listing detail pages.

## 7. Content and data requirements

The product uses Supabase as the primary source for published listings, events, and towns, with shared static data retained as a safe fallback for local development or temporary service unavailability. Listings support the following key properties:

- identity: `id`, `slug`, `name`
- classification: `category`, `subtype`, `town`
- merchandising: `isFeatured`, `isEnhanced`
- presentation: `description`, `images`, `tags`, `priceRange`
- contact: `phone`, `website`, `address`

The demo data is written to feel Northwoods-specific. Before launch, business owners or the editorial team should verify every name, address, phone number, image right, opening hour, price range, and event date.

## 8. Non-functional requirements

- Responsive across common desktop, tablet, and mobile sizes.
- Clear keyboard and touch interaction for filters, buttons, links, and gallery controls.
- Fast initial load with optimized production assets.
- No broken internal routes in the implemented demo scope.
- Featured listings must sort before enhanced listings, and enhanced listings before free listings.
- External providers must be accessed through server-side environment variables rather than exposing secrets in client code.

## 9. Out of scope for the current demo

- Live inventory, reservation, ticketing, or real-estate MLS feeds.
- User accounts and saved itineraries.
- Reviews, ratings moderation, and user-generated photo uploads.
- Full editorial CMS capabilities beyond the implemented moderation dashboard.
- Production billing reconciliation and subscription management.
- Guaranteed event freshness without an editorial workflow.

## 10. Success measures for launch

- Visitors can find a relevant listing in three interactions or fewer from the homepage.
- Every published listing has verified contact and location information.
- Business submission and claim requests reach an internal review queue.
- Newsletter signups persist reliably and reach the chosen provider once provider credentials and sender approval are configured.
- Paid listing upgrades complete through Stripe and are reflected in listing visibility after client approval and webhook implementation.
- Analytics can measure searches, filter use, listing views, claim starts, submissions, and conversions.

## 11. Open product decisions

- Final source and licensing plan for photography and logos.
- Content ownership and review SLA for listings and events.
- Launch region boundaries beyond the nine initial towns.
- Final pricing, billing cadence, tax handling, and refund policy.
- Database/authentication: Supabase with email/password Auth and RLS.
- AI: Groq through the server-side `/api/ask` adapter.
- Maps: Leaflet/OpenStreetMap; Google Maps is not required for the current implementation.
- Hosting: Vercel with SPA rewrites and root serverless API functions.
- Email: Resend domain setup for `glent.xyz` is in progress; newsletter provider and transactional sender behavior still require final configuration.
- Remaining decisions: final photography/license plan, exact email/newsletter provider, Stripe pricing and billing policy, analytics/monitoring, legal copy, and whether `glent.xyz` should become the testing custom domain.

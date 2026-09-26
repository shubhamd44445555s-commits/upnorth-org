# UpNorth.org — Technical Handoff

## 1. Current implementation

The current project is a React/Vite single-page frontend. It uses the existing UpNorth styling and component patterns, with route-aware rendering for public pages, Supabase-backed content hydration, Supabase Auth, and a protected moderation dashboard.

The production build currently completes successfully with:

```bash
npm run build
```

## 2. Frontend responsibilities

- Render regional discovery pages and reusable UI components.
- Apply town/category filters and listing sort order.
- Render photo galleries and lightweight modal interactions.
- Provide demo-safe fallbacks when Supabase or external service keys are absent.
- Keep secrets out of browser bundles.

## 3. Data responsibilities

Supabase is the primary content system for towns, listings, events, business submissions, claims, profiles, and audit logs. The shared TypeScript-style data modules remain as safe fallback content for local development and recovery.

## 4. API adapter responsibilities

Server-compatible adapters exist for the Ask and newsletter flows. Ask calls Groq through `/api/ask` and uses published Supabase listings as candidates. `/api/subscribe` persists subscribers and can sync Brevo or Mailchimp when configured. The browser falls back to Supabase/direct demo behavior when server functions are not available locally.

Important: a plain Vite dev server does not automatically execute server adapters under `/api`. Production hosting must provide compatible serverless/function routing, or the adapters must be moved into the selected backend framework.

## 5. Suggested production architecture

```text
Browser
  ├─ React/Vite frontend
  ├─ directory and town pages
  └─ forms and interaction tracking

Server/API
  ├─ listings, towns, events, and submissions
  ├─ claim and approval review workflow
  ├─ Stripe checkout/webhooks
  ├─ AI concierge request proxy
  ├─ newsletter and email notifications
  └─ maps/geocoding proxy where required

Data services
  ├─ Supabase Postgres with RLS
  ├─ Supabase Auth and profiles roles
  ├─ Supabase Storage listing-images bucket
  ├─ payment provider
  ├─ email/newsletter provider
  ├─ AI provider
  └─ maps provider
```

## 6. Environment variables

The `.env.example` file documents the intended configuration surface. Values should be placed in a local `.env`/`.env.local` or in the deployment provider’s secret manager and should never be committed.

Expected integration groups include:

- AI provider key for Ask Up North.
- Stripe publishable and secret keys plus webhook configuration.
- Newsletter provider key/list identifier.
- Email delivery key and sender configuration.
- Optional newsletter provider variables for Brevo or Mailchimp.
- Supabase publishable URL/key and server aliases.

The exact provider should be selected before wiring final implementation because API shapes, webhook validation, pricing models, and data-retention policies differ.

## 7. Production data model recommendation

Implemented core tables:

- `towns`
- `listings`
- `events`
- `business_submissions`
- `listing_claims`
- `profiles`
- `audit_logs`
- `newsletter_subscribers`
- `contact_messages`

Listings should store a normalized town reference, publication state, paid visibility tier, verified contact fields, and timestamps. Images should be stored through a managed media service with rights metadata and alt text.

## 8. Security and privacy requirements

- Keep API secrets server-side.
- Validate and rate-limit public submission, claim, newsletter, and AI endpoints.
- Add spam protection to forms.
- Verify Stripe webhook signatures.
- Sanitize rich text and uploaded media metadata.
- Define retention and deletion rules for business and newsletter data.
- Add privacy policy, terms, cookie/analytics disclosure, and consent behavior before launch.

## 9. Deployment notes

The repository includes `vercel.json` for Vite output and SPA rewrites. The root `api/` functions are compatible with Vercel serverless routing. Add the documented environment variables in Vercel before deployment.

Production deployment should include:

- HTTPS and custom domain.
- Environment secrets configured in the host.
- Build command `npm run build`.
- Static output directory `dist`.
- SPA fallback/rewrite to `index.html` for client-side routes.
- API routing for server adapters.
- Error monitoring and uptime checks.

## 10. Handoff risks

- Demo content can be mistaken for verified business information.
- Remote image URLs may change or have licensing restrictions.
- LocalStorage remains only as a fallback when Supabase is unavailable; normal submissions are stored in Supabase.
- Client-side paid-tier flags are not a payment source of truth until Stripe billing/webhooks are approved and connected.
- Event dates can become stale without an editorial process.

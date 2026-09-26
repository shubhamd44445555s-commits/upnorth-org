# UpNorth.org Documentation Pack

## Purpose

This documentation pack describes the UpNorth.org regional discovery website that has been built for client handoff. It records the current product scope, implemented routes, technology decisions, QA status, and the work still required before production launch.

## Documents

1. [Product Requirements Document](./PRD.md) — product vision, users, requirements, and scope.
2. [Feature and Route Specification](./FEATURE-ROUTES.md) — implemented pages, reusable components, content behavior, and acceptance criteria.
3. [Technical Handoff](./TECHNICAL-HANDOFF.md) — architecture, data model, integrations, environment variables, and operating notes.
4. [QA and Release Checklist](./QA-AND-RELEASE.md) — tested behavior, current limitations, launch checklist, and sign-off fields.
5. [Supabase Setup](./SUPABASE-SETUP.md) — admin provisioning, environment variables, migrations, RLS, storage, and newsletter provider setup.
6. [Resend + Dynadot Setup](./RESEND-DYNADOT-SETUP.md) — safe domain provisioning, DNS automation, verification, and credential handling.

## Current status

The frontend, Supabase-backed workflows, Groq server adapter, Leaflet maps, Vercel deployment, and moderation foundation are implemented. The production build passes with `npm run build`.

Client-review links:

- Stable deployment: [https://upnorth-org-preview.vercel.app](https://upnorth-org-preview.vercel.app)
- Latest preview deployment: [https://upnorth-org-preview-680gsfm04-shubhamd44445555s-9978s-projects.vercel.app](https://upnorth-org-preview-680gsfm04-shubhamd44445555s-9978s-projects.vercel.app)
- GitHub repository: [https://github.com/shubhamd44445555s-commits/upnorth-org](https://github.com/shubhamd44445555s-commits/upnorth-org)

Still pending: Vercel environment variables, Stripe/pricing after client approval, final licensed image assets, Resend verification and sender activation for `glent.xyz`, newsletter/transactional provider activation, custom-domain attachment, legal copy, analytics, and monitoring.

## Important scope note

The original design direction is preserved. New functionality was added using the existing UpNorth visual language rather than introducing a separate redesign system.

## Document control

| Field | Value |
|---|---|
| Product | UpNorth.org |
| Document pack | Client handoff v1.1 |
| Prepared | 27 September 2026 |
| Status | Client-review deployment live; production hardening pending |
| Owner | UpNorth.org project team |

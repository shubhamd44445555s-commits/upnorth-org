# Resend + Dynadot domain setup

The project includes a one-time setup utility at `scripts/setup-resend-dynadot.mjs`.
It creates or reuses the domain in Resend, reads the required DNS records, adds them to Dynadot, and asks Resend to verify the domain.

## Current status — 27 September 2026

The testing domain is `glent.xyz` (not `upnorth.org`). The required Resend TXT/CNAME records have been added through Dynadot and public DNS lookups confirm that they are visible. Resend still reports the domain as `pending`, so sender verification is not complete yet. Allow DNS/provider propagation time and use the verification-only command below to check again.

## What you need

Create a Resend API key and Dynadot API credentials. Dynadot's current REST API requires both an API key and API secret for signed write requests.

Add these values to your local `.env.local` file only:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_DOMAIN=glent.xyz
DYNADOT_API_KEY=your_dynadot_api_key
DYNADOT_API_SECRET=your_dynadot_api_secret
DYNADOT_API_BASE_URL=https://api.dynadot.com
```

Never commit `.env.local`, API keys, or API secrets. `.env.*` is already ignored by Git.

## Safe run order

First run a dry run. It makes no Resend or Dynadot changes:

```bash
npm run setup:email:dry
```

When the output looks correct, intentionally enable live changes:

```powershell
$env:RESEND_SETUP_CONFIRM="YES"
npm run setup:email
```

The script adds records one at a time so existing Dynadot DNS records are not sent as a replacement payload. If the domain is using third-party nameservers, Dynadot will not be authoritative; add the records at the provider named by those nameservers instead.

For the already-applied DNS setup, check verification without changing DNS:

```bash
npm run verify:email
```

If a new domain or record set is required, re-run the dry run first and then the explicitly confirmed live command. Resend may remain `pending` until DNS propagation and provider validation complete.

The utility accepts the Dynadot credential aliases already present in the local setup (`DYNADOT_API_KEY_PRODUCTION_KEY` and `DYNADOT_API_KEY_SECRET_KEY`) in addition to the canonical names shown above. Keep the actual values out of documentation and Git.

## Important safety notes

- The script is dry-run by default.
- Live changes require both `--apply` and `RESEND_SETUP_CONFIRM=YES`.
- Do not put Resend or Dynadot credentials in browser variables such as `VITE_RESEND_API_KEY`.
- Use Dynadot's sandbox API URL and sandbox credentials first if you want to test the signed request flow.

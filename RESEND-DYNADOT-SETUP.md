# Resend + Dynadot domain setup

The project includes a one-time setup utility at `scripts/setup-resend-dynadot.mjs`.
It creates or reuses the domain in Resend, reads the required DNS records, adds them to Dynadot, and asks Resend to verify the domain.

## What you need

Create a Resend API key and Dynadot API credentials. Dynadot's current REST API requires both an API key and API secret for signed write requests.

Add these values to your local `.env.local` file only:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_DOMAIN=upnorth.org
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

Resend may remain `pending` until DNS propagation completes. Re-run `npm run setup:email` later to request verification again.

## Important safety notes

- The script is dry-run by default.
- Live changes require both `--apply` and `RESEND_SETUP_CONFIRM=YES`.
- Do not put Resend or Dynadot credentials in browser variables such as `VITE_RESEND_API_KEY`.
- Use Dynadot's sandbox API URL and sandbox credentials first if you want to test the signed request flow.

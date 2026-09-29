# Client message draft — UpNorth.org Super Admin Panel

Hi,

The UpNorth.org Super Admin Panel and the complete debugging pass are now complete. The panel is built as a secure, separate management workspace and keeps the existing public UpNorth.org design intact.

## What the admin panel can manage

### Dashboard and moderation

- View business, featured listing, event, town, newsletter, and pending-approval statistics.
- Review and approve/reject new business submissions.
- Review and approve/reject business claim requests.
- See recent administrative activity and security events.

### Businesses and listings

- Create, edit, publish, draft, and delete business listings.
- Manage stay, eat & drink, things to do, and real-estate listings.
- Edit listing name, slug, town, category, subtype, price range, description, phone, website, address, tags, and images.
- Mark listings as Featured or Enhanced.
- Control listing visibility through publication status.

### Towns and events

- Create and edit towns.
- Manage town hero images, introductions, nearest lakes, “known for” content, nearby towns, and publication status.
- Publish or unpublish events.

### Media and homepage images

- Upload approved images to the Supabase media library.
- Delete media where the role permits it.
- Assign an uploaded image to the homepage hero, life section, or discovery-card slots.
- Image assignments use validated HTTPS URLs and protected site-content permissions.

### Site Content & Design CMS

The admin can edit the public frontend without changing code:

- Homepage hero title and subtitle.
- Homepage section headings and descriptions.
- Discovery card titles, descriptions, buttons, and images.
- Newsletter and “More Than a Destination” section content.
- Navigation labels and Plan Your Trip button text.
- Footer labels and footer tagline.
- Global colors, heading font, body font, corner roundness, and spacing scale.
- Homepage section visibility and order.
- Published articles automatically appear on the homepage and the public `/blog` pages.

The editor accepts controlled text, approved design tokens, known sections, and validated image URLs. It does not allow arbitrary scripts, unsafe HTML, or unrestricted CSS.

### Articles and content

- Create articles and guides.
- Save articles as drafts.
- Publish or update articles.
- Manage title, slug, excerpt, body, hero image, SEO title, and SEO description.
- Published articles are available on `/blog` and `/blog/[slug]`; the previous `/articles` routes remain supported.
- Supported content create, edit, publish/unpublish, and delete operations, along with settings, role, and status changes, create a server-side before/after record.
- Authorized administrators can review the changed fields, actor ID, and timestamp in Change history; the full before/after snapshots remain protected in Supabase.

### Categories, messages, and newsletter

- Manage listing, place, and real-estate categories.
- View contact messages from the public contact page.
- View newsletter subscribers.
- Export subscribers as CSV.
- Newsletter sending is prepared but requires the client’s verified Resend domain and private API key.

### Users, roles, and security

- View users and their roles.
- Super Admin can manage administrator roles subject to server-side checks.
- Account suspension/reactivation and session revocation are available when the private Supabase service-role configuration is added.
- Review audit logs and security events.
- Review the append-only Change history with before/after snapshots for administrative edits.
- AI provider settings can be managed as non-secret configuration; API keys remain deployment secrets.

## Security architecture

Admin access uses Supabase Auth. Every sensitive action is checked server-side and against Supabase Row Level Security. The system does not use a master password, hidden backdoor, secret URL, frontend-only role check, or hard-coded credential.

## Intentionally pending

- Stripe and pricing controls remain locked until commercial approval.
- Resend sender-domain verification and production email sending require client setup.
- Supabase service-role configuration is required for invitation and global session-revocation features.
- Final production image licensing, analytics, monitoring, legal copy, backups, and provider configuration remain client-owned launch tasks.

## Debugging and QA completed

- Production build passed.
- Admin security tests passed.
- Dependency audit reported zero high-severity vulnerabilities.
- 45 remote image URLs were checked; broken image reference was fixed.
- Core public routes and admin entry routes were browser-tested.
- Live routes on `https://glent.xyz` returned successfully.
- Malformed admin requests now return safe client errors instead of server errors.

The code is pushed to the project GitHub repository, and the latest fixes are ready for Vercel deployment.

Regards,  
UpNorth.org Project Team

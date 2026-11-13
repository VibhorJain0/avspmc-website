# AVSPMC website

The AVSPMC project management consultancy website, for **avspmc.avsllp.co**.

- **Website:** six static pages (HTML, CSS, JavaScript), hosted on Vercel from this GitHub repository.
- **Admin (CMS + CRM):** `/admin/`, a password-protected page for enquiries, projects and site content.
- **Database:** Supabase project **avspmc** (Mumbai region). Content and enquiries live there, not in this repository.

## Day-to-day: use the admin page

Go to `https://avspmc.avsllp.co/admin/` and sign in.

| Tab | What you can do |
|---|---|
| **Enquiries** (CRM) | See every contact-form enquiry, call/WhatsApp/email the person, move it through *New → Contacted → Proposal sent → Won / Lost*, and keep notes. |
| **Projects** (CMS) | Add, edit, hide or delete projects, upload photos, and choose which ones appear on the home page. |
| **Site content** (CMS) | Phone, WhatsApp, email, address, office hours, the four figures on the About page, the home-page testimonial, and the "sample content" notice. |

Changes appear on the website immediately; no code changes or redeploys are needed.

### Giving someone admin access

1. In the Supabase dashboard for **avspmc**, open **Authentication → Users → Add user → Create new user**. Enter their email and a password, and tick **Auto Confirm User**.
2. Copy the new user's **UID**, open **SQL Editor** and run:
   ```sql
   insert into public.admins (user_id) values ('PASTE-THE-UID-HERE');
   ```

Anyone signed in who is *not* in the `admins` table sees nothing: the database rules block them from enquiries and from editing.

**Recommended:** in **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**, so accounts can only be created from the dashboard.

## What still lives in the code

| To change… | Edit this file |
|---|---|
| Page text (headings, paragraphs, services, sectors) | the page's own `.html` file |
| Colours and fonts | `assets/css/tokens.css` |
| Logo text, company name, footer tagline | `assets/js/site-data.js` → `company` |
| Sector names (filter, contact form, admin) | `assets/js/config.js` → `sectors` |
| Supabase connection | `assets/js/config.js` |

`assets/js/site-data.js` also holds a **backup copy** of the projects and contact details. The site uses it only if Supabase can't be reached, so the pages never show up empty. It doesn't need to match the database exactly.

The key in `config.js` is Supabase's *publishable* key. It is designed to be public: the database's row-level security rules allow visitors only to read published content and submit enquiries.

## Before going live

1. Replace the sample projects and photos in the admin page with your real ones. The current photos are stock images (see `CREDITS.md`) and must not be presented as your work.
2. Update contact details and figures under **Site content**.
3. Edit the "How we started" story and Leadership names in `about.html`.
4. Untick **Show the sample-content bar** under **Site content**.
5. Have `privacy.html` reviewed by your legal adviser (it is written for India's DPDP Act, 2023).

## Search, sharing and analytics

- `/sitemap.xml` is built live by `api/sitemap.js`: the fixed pages plus every published case
  study and article, so new ones are listed automatically. `robots.txt` excludes the admin page.
  Submit `https://avspmc.avsllp.co/sitemap.xml` in Google Search Console.
- Case study and article pages are built on the server by `api/page.js` (from `templates/` and
  `assets/js/render.js`), so Google and link previews see the real title, text and photo.
  Admin edits show up there within about 5 minutes.
- Structured data for Google: business details on the home page, breadcrumbs on every page,
  FAQ on the FAQ page, and article data on case studies and articles. Your phone, email and
  address are added automatically once the sample contact details are replaced.
- Photos: each built-in photo has WebP copies at 800 and 1600 px (`name-800.webp`,
  `name-1600.webp`). If you add a new photo to `assets/img/photos/`, make the same two copies.
  Photos uploaded in the admin page are resized automatically by Vercel.
- Every page has share tags, so links on WhatsApp/LinkedIn show a title, description and
  `assets/img/share.jpg` (1200×630). Replace that image with one of your own projects when you can.
- Visitor analytics: Vercel Web Analytics (cookieless). Turn it on once in Vercel → project
  **avspmc-website** → **Analytics** → **Enable**. The script is already on every page.

## Hosting setup (one time)

1. **Vercel:** Add New → Project → import `VibhorJain0/avspmc-website`. Framework preset: *Other*. No build command.
2. **Vercel → Settings → Domains:** add `avspmc.avsllp.co`.
3. **GoDaddy DNS** for avsllp.co: CNAME `avspmc` (and the old `avspms`) pointing to the value Vercel shows. `avspms.avsllp.co` redirects to `avspmc.avsllp.co`.

Every push to the `main` branch redeploys the site automatically.

## Files

```
index.html  about.html  services.html  sectors.html  projects.html  contact.html  privacy.html
robots.txt  vercel.json (routes for the two server-built pages, sitemap and image resizing)
api/page.js             builds case-study.html and article.html on the server
api/sitemap.js          builds /sitemap.xml
templates/              page shells for case-study.html and article.html
admin/                  admin page (index.html, admin.js, admin.css)
assets/js/render.js     case study / article / card HTML, shared by the browser and api/page.js
assets/css/tokens.css   colours, fonts, spacing
assets/css/site.css     layout and components
assets/js/config.js     Supabase connection and sector list
assets/js/site.js       loads content, renders projects, filter, contact form
assets/js/site-data.js  company name + offline backup of content
assets/img/photos/      photographs (stock, see CREDITS.md)
REFERENCES.md           the 10 PMC sites used as reference
CREDITS.md              photo sources and licence
```

## Case studies, insights, careers, estimator, FAQ

| Feature | Where it lives | How to change it |
|---|---|---|
| Case studies (`case-study.html?p=<address>`) | Each project in the database | Admin → Projects → a project → "Case study page" (tick the box, fill challenge, what we did, up to 3 results, optional quote) |
| Insights / articles (`insights.html`, `article.html?p=<address>`) | `posts` table | Admin → Insights. Formatting: blank line between paragraphs, `##` heading, `-` bullet, `1.` numbered, `**bold**`, `[text](link)` |
| Careers (`careers.html`) | `site_settings` → `jobs` | Admin → Site content → Job openings. Applications arrive in Enquiries as "Job application" |
| Cost estimator (`estimator.html`) | `assets/js/config.js` → `estimator` | **The rates there are SAMPLE figures.** Replace them with AVSPMC's own ₹/sq ft ranges and fee percentages before promoting the tool. Call-back requests arrive in Enquiries as "Cost estimator" |
| FAQ (`faq.html`) | The page itself | Edit both the visible answers and the matching JSON-LD block at the top (used by Google) |
| Floating WhatsApp/Call bar | `assets/js/site.js` | Shown on phones only, using the WhatsApp and phone numbers from Site content |

## Dark mode, before/after slider, client logos

- **Dark mode** follows each visitor's device setting; the sun/moon button in the header switches it and the choice is remembered in that browser. Dark colours are the second block in `assets/css/tokens.css`. The admin page always stays light.
- **Before/after slider**: Admin → Projects → a project → Case study page → upload a Before and an After photo (same spot and angle). The slider appears on that case study only when both are set.
- **Client logos**: Admin → Site content → Client logos (up to 12, PNG with transparent background works best). The moving strip appears on the home page once at least one is saved. Only add clients who have agreed to be shown.

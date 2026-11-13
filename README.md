# AVSPMC website

A six-page static website (HTML, CSS, JavaScript). No build step, no database. Upload the whole
folder to any web host (Netlify, Hostinger/cPanel, GitHub Pages) and it works.

To view it on your computer, double-click `index.html`.

## What to edit, and where

| To change… | Edit this file |
|---|---|
| Company name (logo text), phone, email, WhatsApp, address | `assets/js/site-data.js` (top section) |
| Figures (120+ projects, etc.) on the About page | `assets/js/site-data.js` → `stats` |
| Projects on the Home and Projects pages | `assets/js/site-data.js` → `projects` |
| The testimonial on the Home page | `assets/js/site-data.js` → `testimonials` |
| Colours and fonts | `assets/css/tokens.css` |
| Page text (headings, paragraphs) | the page's own `.html` file |
| Photos | replace files in `assets/img/photos/` (keep the same file names, or update the paths) |
| Browser-tab titles and Google descriptions | `<title>` and `<meta name="description">` at the top of each `.html` file |

### Before going live

1. Replace every item marked `SAMPLE` in `assets/js/site-data.js` with real details.
2. Replace the project photos (`proj-*.jpg`) with photos of your own projects. The current ones
   are stock photos (see `CREDITS.md`) and must not be presented as your work.
3. Replace the "How we started" story, the figures and the Leadership names in `about.html`.
4. Set `showSampleNotice: false` in `site-data.js` to remove the notice bar at the top.
5. If you rename the company, also find-and-replace "AVSPMC" in the six `.html` files
   (this updates the browser-tab titles and a few sentences).

### Changing the logo

The logo is a wordmark: **AVS** in bold and PMC in light, spaced out, in the brand blue. The two
parts come from `logoBold` and `logoLight` in `site-data.js`; the colour is `--blue` in `tokens.css`.

To use a logo image instead, put it in `assets/img/` and, in `assets/js/site.js`, change the
`logo()` function to return
`<a class="logo" href="index.html"><img src="assets/img/your-logo.svg" alt="AVSPMC" height="32"></a>`.

`assets/img/logo.svg` is a standalone copy for letterheads and social media.

### Photos

Good replacement photos are what will make this site feel real. For each project, one strong
exterior photo in landscape format (at least 1600 px wide) is enough. Compress photos before
uploading (for example with squoosh.app) so each is under about 400 KB.

The home page's lead project uses `featured: "lead"` in `site-data.js`; the next two with
`featured: true` appear below it.

## How the contact form works

There is no server. "Send by email" opens the visitor's email app with the enquiry filled in,
addressed to the email in `site-data.js`. "Send on WhatsApp" opens WhatsApp with the same text.
To receive submissions directly instead, sign up for a form service such as Formspree and point
the form at it.

## Files

```
index.html  about.html  services.html  sectors.html  projects.html  contact.html
assets/css/tokens.css   colours, fonts, spacing
assets/css/site.css     layout and components
assets/js/site-data.js  all editable content
assets/js/site.js       header, footer, project lists, filter, form
assets/img/photos/      photographs (stock, see CREDITS.md)
assets/img/             logo and favicon
REFERENCES.md           the 10 PMC sites used as reference
CREDITS.md              photo sources and licence
```

// AVSPMC: /sitemap.xml, built live so new case studies and articles added
// in the admin page are listed for Google automatically (cached for 1 hour).
// To add a new static page, add it to PAGES below.
const SITE = "https://avspmc.avsllp.co";
const SUPABASE_URL = "https://ukymhlwtbbcyohilwtrm.supabase.co";
const SUPABASE_KEY = "sb_publishable_tNc6CCpW5te-UXInffKeSA_H4l_FlCJ"; // public, read-only key (same as config.js)

const PAGES = [
  ["", "monthly", "1.0"],
  ["services.html", "monthly", "0.8"],
  ["projects.html", "weekly", "0.8"],
  ["sectors.html", "monthly", "0.7"],
  ["about.html", "monthly", "0.7"],
  ["resources.html", "monthly", "0.7"],
  ["insights.html", "weekly", "0.7"],
  ["estimator.html", "monthly", "0.7"],
  ["contact.html", "yearly", "0.6"],
  ["faq.html", "monthly", "0.6"],
  ["careers.html", "monthly", "0.4"],
  ["privacy.html", "yearly", "0.2"],
];

async function rest(query) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/" + query, {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error("Supabase " + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function entry(loc, lastmod, freq, priority) {
  return "  <url><loc>" + loc.replace(/&/g, "&amp;") + "</loc>" +
    (lastmod ? "<lastmod>" + String(lastmod).slice(0, 10) + "</lastmod>" : "") +
    "<changefreq>" + freq + "</changefreq><priority>" + priority + "</priority></url>";
}

module.exports = async function handler(req, res) {
  const urls = PAGES.map(([p, freq, pr]) => entry(SITE + "/" + p, "", freq, pr));
  let ok = true;
  try {
    const [cases, posts] = await Promise.all([
      rest("projects?select=slug,updated_at&published=eq.true&case_study=eq.true&order=sort_order.asc"),
      rest("posts?select=slug,updated_at&published=eq.true&order=published_at.desc"),
    ]);
    cases.forEach((c) => { if (c.slug) urls.push(entry(SITE + "/case-study.html?p=" + c.slug, c.updated_at, "monthly", "0.6")); });
    posts.forEach((p) => { if (p.slug) urls.push(entry(SITE + "/article.html?p=" + p.slug, p.updated_at, "monthly", "0.6")); });
  } catch (e) {
    ok = false;
    console.error("sitemap.js:", e.message);
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", ok ? "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" : "no-store");
  res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join("\n") + "\n</urlset>\n");
};

// AVSPMC: builds case-study.html?p=<slug> and article.html?p=<slug> on the
// server, so search engines and link previews (WhatsApp, LinkedIn) get the
// real title, description, photo and text instead of an empty page.
//
// vercel.json sends both addresses here. The page shell lives in
// templates/, and the HTML for the content comes from assets/js/render.js,
// the same code the browser uses. Pages are cached for 5 minutes, so an
// edit in the admin page shows up within about 5 minutes.
//
// If Supabase can't be reached, the plain shell is returned and the
// browser loads the content itself, exactly as before.
const fs = require("fs");
const path = require("path");
const R = require("../assets/js/render.js");

const SITE = "https://avspmc.avsllp.co";
const SUPABASE_URL = "https://ukymhlwtbbcyohilwtrm.supabase.co";
const SUPABASE_KEY = "sb_publishable_tNc6CCpW5te-UXInffKeSA_H4l_FlCJ"; // public, read-only key (same as config.js)
const ORG_ID = SITE + "/#org";

const PAGES = {
  case: { file: "case-study.html", attr: "data-case-study", section: ["Projects", "projects.html"] },
  article: { file: "article.html", attr: "data-article", section: ["Insights", "insights.html"] },
};

const esc = R.esc;

function absolute(url) {
  if (!url) return SITE + "/assets/img/share.jpg";
  return /^https?:\/\//.test(url) ? url : SITE + "/" + String(url).replace(/^\//, "");
}

function shorten(text, max) {
  const s = String(text || "").replace(/[#*\[\]]/g, "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : s;
}

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

function jsonLd(obj) {
  return '  <script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, "\\u003c") + "</script>\n";
}

// Swaps the <title>, description and social tags, and adds anything extra before </head>.
function setHead(html, { title, description, url, image, type, extra }) {
  html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(title) + "</title>");
  html = html.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(description) + '">');
  html = html.replace(/\s*<meta (property="og:[^"]+"|name="twitter:[^"]+") content="[^"]*">/g, "");
  const tags = [
    url ? '<link rel="canonical" href="' + esc(url) + '">' : "",
    '<meta property="og:type" content="' + type + '">',
    '<meta property="og:site_name" content="AVSPMC">',
    '<meta property="og:title" content="' + esc(title) + '">',
    '<meta property="og:description" content="' + esc(description) + '">',
    url ? '<meta property="og:url" content="' + esc(url) + '">' : "",
    '<meta property="og:image" content="' + esc(image) + '">',
    '<meta property="og:locale" content="en_IN">',
    '<meta name="twitter:card" content="summary_large_image">',
  ].filter(Boolean).map((t) => "  " + t + "\n").join("");
  return html.replace("</head>", tags + (extra || "") + "</head>");
}

function setMain(html, page, slug, inner) {
  return html.replace(
    new RegExp("<main id=\"main\" " + page.attr + ">[\\s\\S]*?</main>"),
    () => '<main id="main" ' + page.attr + ' data-prerendered="' + esc(slug) + '">' + inner + "</main>"
  );
}

function send(res, status, html, cache) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.end(html);
}

function notFoundPage(html, kind, page, slug) {
  html = setHead(html, {
    title: (kind === "article" ? "Article" : "Case study") + " not found | AVSPMC",
    description: "This page could not be found.",
    type: "website",
    image: absolute(""),
    extra: '  <meta name="robots" content="noindex">\n',
  });
  return setMain(html, page, slug, R.notFound(kind));
}

module.exports = async function handler(req, res) {
  const q = new URL(req.url, SITE).searchParams;
  const kind = q.get("kind") === "article" ? "article" : "case";
  const page = PAGES[kind];
  const slug = q.get("p") || "";
  const shell = fs.readFileSync(path.join(process.cwd(), "templates", page.file), "utf8");
  const CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";

  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return send(res, 404, notFoundPage(shell, kind, page, slug), CACHE);

  let item, more;
  try {
    if (kind === "case") {
      [item] = await rest("projects?select=*&published=eq.true&case_study=eq.true&slug=eq." + encodeURIComponent(slug));
    } else {
      [[item], more] = await Promise.all([
        rest("posts?select=*&published=eq.true&slug=eq." + encodeURIComponent(slug)),
        rest("posts?select=slug,title,excerpt,cover_url,published_at&published=eq.true&slug=neq." + encodeURIComponent(slug) + "&order=published_at.desc&limit=2"),
      ]);
    }
  } catch (e) {
    console.error("page.js:", e.message);
    return send(res, 200, shell, "no-store"); // the browser will load the content itself
  }
  if (!item) return send(res, 404, notFoundPage(shell, kind, page, slug), CACHE);

  const url = SITE + "/" + page.file + "?p=" + slug;
  const crumbs = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: page.section[0], item: SITE + "/" + page.section[1] },
      { "@type": "ListItem", position: 3, name: kind === "case" ? item.name : item.title, item: url },
    ],
  };
  const org = { "@type": "ProfessionalService", "@id": ORG_ID, name: "AVSPMC", url: SITE + "/", logo: SITE + "/assets/img/logo.svg" };

  let head, inner;
  if (kind === "case") {
    const description = shorten(item.challenge || item.scope, 155);
    const image = absolute(item.photo_url);
    head = {
      title: item.name + ", " + item.city + " | AVSPMC case study",
      description, url, image, type: "article",
      extra: jsonLd({
        "@context": "https://schema.org",
        "@graph": [{
          "@type": "Article",
          headline: shorten(item.name + ", " + item.city, 110),
          description, image: [image], url, mainEntityOfPage: url,
          about: item.sector,
          author: { "@id": ORG_ID }, publisher: { "@id": ORG_ID },
          datePublished: item.created_at, dateModified: item.updated_at,
        }, crumbs, org],
      }),
    };
    inner = R.caseStudyMain(item);
  } else {
    const description = shorten(item.excerpt || item.body, 155);
    const image = absolute(item.cover_url);
    head = {
      title: item.title + " | AVSPMC",
      description, url, image, type: "article",
      extra: '  <meta property="article:published_time" content="' + esc(item.published_at) + '">\n' + jsonLd({
        "@context": "https://schema.org",
        "@graph": [{
          "@type": "Article",
          headline: shorten(item.title, 110),
          description, image: [image], url, mainEntityOfPage: url,
          author: item.author && !/avspmc/i.test(item.author) ? { "@type": "Person", name: item.author } : { "@id": ORG_ID },
          publisher: { "@id": ORG_ID },
          datePublished: item.published_at, dateModified: item.updated_at,
        }, crumbs, org],
      }),
    };
    inner = R.articleMain(item, more || []);
  }

  send(res, 200, setMain(setHead(shell, head), page, slug, inner), CACHE);
};

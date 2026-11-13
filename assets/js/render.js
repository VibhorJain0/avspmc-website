/* =====================================================================
   AVSPMC — SHARED PAGE BUILDERS
   Used in two places so they always produce the same HTML:
   - in the browser, as window.AVS_RENDER (loaded before site.js)
   - on the server, by api/page.js, which builds case-study.html and
     article.html in full so Google and link previews see real content.
   Keep this file free of browser-only things (window, document).
   ===================================================================== */
(function (root) {
  "use strict";

  var SUPABASE_STORAGE = "https://ukymhlwtbbcyohilwtrm.supabase.co/storage/v1/object/public/";
  var R = {
    // Resize uploaded photos through Vercel's image service. site.js turns
    // this off when the site is opened locally, where that service doesn't exist.
    optimise: true,
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function prettyDate(iso) {
    var d = new Date(String(iso || "").slice(0, 10) + "T00:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }

  // A small, safe Markdown subset for articles: ## / ### headings,
  // paragraphs, "- " and "1. " lists, **bold** and [links](url).
  function inline(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
        var ok = /^(https:\/\/|mailto:|tel:|[a-z0-9-]+\.html|#)/i.test(url);
        return ok ? '<a href="' + url + '"' + (/^https:/.test(url) ? ' rel="noopener" target="_blank"' : "") + ">" + label + "</a>" : label;
      });
  }
  function markdown(src) {
    var out = [], list = null;
    function close() { if (list) { out.push("</" + list + ">"); list = null; } }
    String(src || "").replace(/\r/g, "").split(/\n{2,}/).forEach(function (block) {
      var lines = block.split("\n").filter(function (l) { return l.trim(); });
      if (!lines.length) return;
      if (/^###\s/.test(lines[0])) { close(); out.push("<h3>" + inline(lines[0].replace(/^###\s+/, "")) + "</h3>"); lines = lines.slice(1); }
      else if (/^##\s/.test(lines[0])) { close(); out.push("<h2>" + inline(lines[0].replace(/^##\s+/, "")) + "</h2>"); lines = lines.slice(1); }
      if (!lines.length) return;
      var ul = lines.every(function (l) { return /^\s*[-*]\s+/.test(l); });
      var ol = lines.every(function (l) { return /^\s*\d+\.\s+/.test(l); });
      if (ul || ol) {
        close();
        list = ul ? "ul" : "ol";
        out.push("<" + list + ">");
        lines.forEach(function (l) { out.push("<li>" + inline(l.replace(/^\s*([-*]|\d+\.)\s+/, "")) + "</li>"); });
        close();
      } else {
        close();
        out.push("<p>" + inline(lines.join(" ")) + "</p>");
      }
    });
    close();
    return out.join("\n");
  }

  /* ---- Responsive images -------------------------------------------
     Built-in photos (assets/img/photos/x.jpg) have ready-made WebP copies
     at 800 and 1600 px wide. Photos uploaded in the admin page are resized
     on the fly by Vercel. If either fails, the browser falls back to the
     original file. */
  var LOCAL_PHOTO = /^\/?assets\/img\/photos\/([a-z0-9-]+)\.jpg$/;
  var WIDTHS = [640, 960, 1280, 1920];
  function srcset(url) {
    url = String(url || "");
    var m = url.match(LOCAL_PHOTO);
    if (m) return "assets/img/photos/" + m[1] + "-800.webp 800w, assets/img/photos/" + m[1] + "-1600.webp 1600w";
    if (R.optimise && url.indexOf(SUPABASE_STORAGE) === 0) {
      return WIDTHS.map(function (w) {
        return "/_vercel/image?url=" + encodeURIComponent(url) + "&w=" + w + "&q=75 " + w + "w";
      }).join(", ");
    }
    return "";
  }
  function img(url, alt, o) {
    o = o || {};
    var set = srcset(url);
    return "<img" + (o.cls ? ' class="' + o.cls + '"' : "") + ' src="' + esc(url) + '"' +
      (set ? ' srcset="' + esc(set) + '" sizes="' + (o.sizes || "(max-width: 1240px) 100vw, 1200px") + '"' +
             " onerror=\"this.onerror=null;this.removeAttribute('srcset')\"" : "") +
      ' alt="' + esc(alt) + '"' + (o.lazy ? ' loading="lazy"' : "") + ">";
  }

  /* ---- Case study (case-study.html?p=<slug>) ------------------------ */
  function caseStudyMain(p) {
    var results = Array.isArray(p.results) ? p.results : [];
    return '<section class="page-intro"><div class="wrap">' +
        '<p class="crumb"><a href="index.html">Home</a> / <a href="projects.html">Projects</a> / Case study</p>' +
        '<div class="intro-text"><h1>' + esc(p.name) + "</h1><p>" + esc(p.sector) + ", " + esc(p.city) + ". " + esc(p.scope) + "</p></div>" +
      "</div></section>" +
      (p.photo_url ? '<div class="wrap page-image">' + img(p.photo_url, p.name) + "</div>" : "") +
      '<section class="section"><div class="wrap">' +
        '<dl class="case-facts">' +
          "<div><dt>Client</dt><dd>" + esc(p.client) + "</dd></div>" +
          "<div><dt>Area</dt><dd>" + esc(p.area) + "</dd></div>" +
          "<div><dt>Project cost</dt><dd>" + esc(p.value) + "</dd></div>" +
          "<div><dt>Status</dt><dd>" + esc(p.status === "Ongoing" ? "Ongoing, " + p.progress + "% complete" : "Completed") + "</dd></div>" +
        "</dl>" +
        '<div class="case-body">' +
          "<div><h2>The challenge</h2><p>" + esc(p.challenge) + "</p></div>" +
          "<div><h2>What we did</h2><p>" + esc(p.approach) + "</p></div>" +
        "</div>" +
        (p.before_url && p.after_url
          ? '<h2 class="case-results-title">Before and after</h2>' +
            '<div class="ba" data-ba>' +
              img(p.after_url, p.name + " after") +
              img(p.before_url, p.name + " before", { cls: "ba-before" }) +
              '<span class="ba-label before">Before</span><span class="ba-label after">After</span>' +
              '<input type="range" min="0" max="100" value="50" aria-label="Drag to compare before and after">' +
              '<span class="ba-line"></span><span class="ba-knob" aria-hidden="true">‹ ›</span>' +
            '</div><p class="ba-caption">Drag the handle, or use the arrow keys, to compare.</p>'
          : "") +
        (results.length ? '<h2 class="case-results-title">Results</h2><dl class="figures case-results">' + results.map(function (r) {
          return "<div><dt>" + esc(r.label) + "</dt><dd>" + esc(r.value) + "</dd></div>";
        }).join("") + "</dl>" : "") +
      "</div></section>" +
      (p.quote ? '<section class="section surface"><div class="wrap"><figure class="testimonial"><blockquote><p>' + esc(p.quote) +
        "</p></blockquote><figcaption><b>" + esc(p.quote_by) + "</b></figcaption></figure></div></section>" : "") +
      '<section class="section"><div class="wrap closing"><div><h2>Planning something similar?</h2>' +
        "<p>Tell us about your project and we will share how we would approach it.</p></div>" +
        '<div><a class="btn" href="contact.html">Discuss your project</a></div></div></section>';
  }

  /* ---- Insights ------------------------------------------------------ */
  function postCard(p) {
    var href = "article.html?p=" + encodeURIComponent(p.slug);
    return '<article class="post-card">' +
      (p.cover_url ? '<a href="' + href + '" tabindex="-1" aria-hidden="true">' +
        img(p.cover_url, "", { lazy: true, sizes: "(max-width: 760px) 100vw, 400px" }) + "</a>" : "") +
      '<p class="post-date">' + esc(prettyDate(p.published_at)) + "</p>" +
      '<h2><a href="' + href + '">' + esc(p.title) + "</a></h2><p>" + esc(p.excerpt) + "</p>" +
      '<a class="text-link" href="' + href + '">Read the article</a></article>';
  }
  // `more` is the list of other articles; leave it out to fill it in later.
  function articleMain(p, more) {
    return '<section class="page-intro"><div class="wrap">' +
        '<p class="crumb"><a href="index.html">Home</a> / <a href="insights.html">Insights</a></p>' +
        '<h1 class="article-title">' + esc(p.title) + "</h1>" +
        '<p class="post-date">' + esc(prettyDate(p.published_at)) + ", " + esc(p.author) + "</p>" +
      "</div></section>" +
      (p.cover_url ? '<div class="wrap page-image">' + img(p.cover_url, "") + "</div>" : "") +
      '<section class="section"><div class="wrap"><div class="article-body">' + markdown(p.body) + "</div></div></section>" +
      '<section class="section surface"><div class="wrap"><div class="head-row"><h2>More insights</h2><a class="text-link" href="insights.html">All insights</a></div>' +
      '<div class="post-grid" data-more-posts' + (more ? ' data-ready="1">' + more.map(postCard).join("") : ">") + "</div></div></section>";
  }

  function notFound(kind) {
    return kind === "article"
      ? '<div class="wrap section"><h1>Article not found</h1><p>We couldn\'t find that article. <a class="text-link" href="insights.html">See all insights</a></p></div>'
      : '<div class="wrap section"><h1>Case study not found</h1><p>We couldn\'t find that case study. <a class="text-link" href="projects.html">See all projects</a></p></div>';
  }

  R.esc = esc;
  R.prettyDate = prettyDate;
  R.markdown = markdown;
  R.img = img;
  R.caseStudyMain = caseStudyMain;
  R.postCard = postCard;
  R.articleMain = articleMain;
  R.notFound = notFound;

  if (typeof module !== "undefined" && module.exports) module.exports = R;
  else root.AVS_RENDER = R;
})(this);

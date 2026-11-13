/* =====================================================================
   AVSPMC — SITE BEHAVIOUR
   Content comes from Supabase (edited on the admin page at /admin/).
   If Supabase can't be reached, the site falls back to the copy in
   site-data.js so it never shows empty. Colours/fonts: ../css/tokens.css.
   ===================================================================== */
(function () {
  "use strict";
  var CFG = window.AVS_CONFIG || {};
  var LOCAL = window.SITE || {};
  var page = document.body.getAttribute("data-page") || "";

  var NAV = [
    { id: "about",    href: "about.html",    label: "About" },
    { id: "services", href: "services.html", label: "Services" },
    { id: "sectors",  href: "sectors.html",  label: "Sectors" },
    { id: "projects", href: "projects.html", label: "Projects" },
    { id: "insights", href: "insights.html", label: "Insights" },
    { id: "resources", href: "resources.html", label: "Resources" },
    { id: "contact",  href: "contact.html",  label: "Contact" },
  ];
  // Extra links shown in the footer only.
  var MORE = [
    { href: "estimator.html", label: "Cost estimator" },
    { href: "faq.html", label: "FAQ" },
    { href: "careers.html", label: "Careers" },
    { href: "privacy.html", label: "Privacy policy" },
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---- Supabase (plain REST, no library needed on the public site) -- */
  function api(path, options) {
    options = options || {};
    var headers = { apikey: CFG.supabaseKey, Authorization: "Bearer " + CFG.supabaseKey };
    if (options.body) { headers["Content-Type"] = "application/json"; headers.Prefer = "return=minimal"; }
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 5000);
    return fetch(CFG.supabaseUrl + "/rest/v1/" + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error("Supabase " + r.status);
      return options.body ? null : r.json();
    });
  }

  // Turns database rows into the same shape as site-data.js.
  function fromDatabase(projects, settings) {
    var s = {};
    settings.forEach(function (row) { s[row.key] = row.value; });
    var c = s.contact || {};
    return {
      showSampleNotice: !!(s.notice && s.notice.showSampleNotice),
      company: LOCAL.company || {},
      contact: {
        email: c.email || "",
        phone: c.phone || "",
        phoneLink: (c.phone || "").replace(/[^\d+]/g, ""),
        whatsapp: (c.whatsapp || "").replace(/\D/g, ""),
        hours: c.hours || "",
        hq: { label: "Head office", address: c.address || "" },
        regions: c.regions || "",
        linkedin: c.linkedin || "",
      },
      stats: s.stats || [],
      testimonials: s.testimonial && s.testimonial.quote ? [s.testimonial] : [],
      projects: projects.map(function (p) {
        return {
          name: p.name, sector: p.sector, city: p.city, client: p.client, area: p.area,
          value: p.value, scope: p.scope, status: p.status, progress: p.progress,
          photo: p.photo_url, featured: p.featured === "lead" ? "lead" : p.featured === "yes",
          slug: p.slug, caseStudy: !!(p.case_study && p.slug),
        };
      }),
      jobs: Array.isArray(s.jobs) ? s.jobs : [],
      sectors: CFG.sectors || LOCAL.sectors || [],
    };
  }

  function loadContent() {
    if (!CFG.supabaseUrl || !window.fetch) return Promise.resolve(LOCAL);
    return Promise.all([
      api("projects?select=*&published=eq.true&order=sort_order.asc,created_at.asc"),
      api("site_settings?select=key,value"),
    ]).then(function (res) {
      return fromDatabase(res[0], res[1]);
    }).catch(function () {
      return LOCAL;
    });
  }

  /* ---- Logo ------------------------------------------------------- */
  function logo(C, extraClass) {
    var name = (C.logoBold || "") + (C.logoLight || "");
    return '<a class="logo ' + (extraClass || "") + '" href="index.html" aria-label="' + esc(name) + ', home">' +
      '<span class="logo-word"><b>' + esc(C.logoBold) + "</b><span>" + esc(C.logoLight) + "</span></span></a>";
  }

  /* ---- Header (drawn straight away, it doesn't need the database) -- */
  var header = $("#site-header");
  if (header) {
    header.innerHTML =
      '<div class="wrap header-inner">' + logo(LOCAL.company || {}) +
      '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>' +
      '<nav id="site-nav" class="site-nav" aria-label="Main"><ul>' +
      NAV.map(function (l) {
        return '<li><a href="' + l.href + '"' + (l.id === page ? ' aria-current="page"' : "") + ">" + l.label + "</a></li>";
      }).join("") +
      "</ul></nav></div>";
    var toggle = $(".nav-toggle", header);
    var nav = $("#site-nav", header);
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
      toggle.textContent = open ? "Menu" : "Close";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { toggle.click(); toggle.focus(); }
    });
  }

  /* ---- Everything that depends on content ------------------------- */
  function render(S) {
    var C = S.company || {};
    var K = S.contact || {};

    if (S.showSampleNotice && !$(".sample-notice")) {
      var n = document.createElement("div");
      n.className = "sample-notice";
      n.textContent = "Sample content: projects, figures and contact details are placeholders and will be replaced.";
      document.body.insertBefore(n, document.body.firstChild);
    }

    var footer = $("#site-footer");
    if (footer) {
      footer.innerHTML =
        '<div class="wrap footer-grid">' +
          '<div class="footer-brand">' + logo(C, "logo-light") + "<p>" + esc(C.tagline) + "</p></div>" +
          '<nav class="footer-col" aria-label="Footer"><h2>Pages</h2><ul>' +
            '<li><a href="index.html">Home</a></li>' +
            NAV.concat(MORE).map(function (l) { return '<li><a href="' + l.href + '">' + l.label + "</a></li>"; }).join("") +
          "</ul></nav>" +
          '<div class="footer-col"><h2>Contact</h2><ul>' +
            '<li><a href="tel:' + esc(K.phoneLink) + '">' + esc(K.phone) + "</a></li>" +
            '<li><a href="mailto:' + esc(K.email) + '">' + esc(K.email) + "</a></li>" +
            '<li><a href="https://wa.me/' + esc(K.whatsapp) + '" rel="noopener" target="_blank">WhatsApp</a></li>' +
            (K.linkedin ? '<li><a href="' + esc(K.linkedin) + '" rel="noopener" target="_blank">LinkedIn</a></li>' : "") +
          "</ul></div>" +
          '<div class="footer-col"><h2>' + esc(K.hq && K.hq.label) + "</h2>" +
            "<p>" + esc(K.hq && K.hq.address) + "</p><p>" + esc(K.regions) + "</p></div>" +
        "</div>" +
        '<div class="wrap footer-base"><p>© ' + new Date().getFullYear() + " " + esc(C.legalName) + "</p>" +
        "<p>" + esc(K.hours) + "</p></div>";
    }

    // Floating WhatsApp and Call buttons on phones.
    if (!$(".quick-contact") && (K.whatsapp || K.phoneLink) && page !== "contact") {
      var q = document.createElement("div");
      q.className = "quick-contact";
      q.innerHTML =
        (K.whatsapp ? '<a class="qc-whatsapp" href="https://wa.me/' + esc(K.whatsapp) + "?text=" +
          encodeURIComponent("Hello AVSPMC, I'd like to discuss a building project.") +
          '" target="_blank" rel="noopener">WhatsApp us</a>' : "") +
        (K.phoneLink ? '<a class="qc-call" href="tel:' + esc(K.phoneLink) + '">Call</a>' : "");
      document.body.appendChild(q);
      document.body.classList.add("has-quick-contact");
    }

    $all("[data-fill]").forEach(function (el) {
      var v = S;
      el.getAttribute("data-fill").split(".").forEach(function (p) { v = v == null ? v : v[p]; });
      if (v != null) el.textContent = v;
    });
    $all("[data-href]").forEach(function (el) {
      var t = el.getAttribute("data-href");
      if (t === "email") el.href = "mailto:" + K.email;
      if (t === "phone") el.href = "tel:" + K.phoneLink;
      if (t === "whatsapp") el.href = "https://wa.me/" + K.whatsapp;
    });

    $all("[data-stats]").forEach(function (el) {
      el.innerHTML = (S.stats || []).map(function (s) {
        return "<div><dt>" + esc(s.label) + "</dt><dd>" + esc(s.value) + "</dd></div>";
      }).join("");
    });

    $all("[data-testimonial]").forEach(function (el) {
      var t = (S.testimonials || [])[0];
      var section = el.closest("section");
      if (!t) { if (section) section.hidden = true; return; }
      el.innerHTML = "<blockquote><p>" + esc(t.quote) + "</p></blockquote>" +
        "<figcaption><b>" + esc(t.name) + "</b>" + esc(t.org) + "</figcaption>";
    });

    renderProjects(S);
    setUpFilter(S);
    setUpForm(S);
    setUpResources();
    setUpCaseStudy();
    setUpInsights();
    setUpArticle();
    setUpCareers(S);
    setUpEstimator();
  }

  /* ---- Small helpers for the content pages ------------------------- */
  function param(name) { return new URLSearchParams(location.search).get(name) || ""; }
  function prettyDate(iso) {
    var d = new Date(iso + "T00:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }
  function setMeta(title, description) {
    if (title) document.title = title + " | AVSPMC";
    var m = $('meta[name="description"]');
    if (m && description) m.setAttribute("content", description);
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
  function money(n) {
    if (n >= 1e7) return "₹" + (n / 1e7).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, "") + " Cr";
    if (n >= 1e5) return "₹" + (n / 1e5).toFixed(1).replace(/\.0$/, "") + " lakh";
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }
  function validLead(form, prefix) {
    var ok = true;
    $all(".field-error", form).forEach(function (x) { x.textContent = ""; });
    $all("[aria-invalid]", form).forEach(function (x) { x.removeAttribute("aria-invalid"); });
    function fail(id, msg) {
      var f = $("#" + id);
      f.setAttribute("aria-invalid", "true");
      $("#" + id + "-error").textContent = msg;
      if (ok) f.focus();
      ok = false;
    }
    var name = $("#" + prefix + "-name").value.trim(), phone = $("#" + prefix + "-phone").value.trim();
    var emailEl = $("#" + prefix + "-email"), email = emailEl ? emailEl.value.trim() : "";
    if (!name) fail(prefix + "-name", "Enter your name.");
    if (!/^[+\d][\d\s-]{7,}$/.test(phone)) fail(prefix + "-phone", "Enter a phone number with at least 8 digits.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(prefix + "-email", "Check the email address, or leave it blank.");
    return ok ? { name: name, phone: phone, email: email } : null;
  }

  /* ---- Case study page (case-study.html?p=<slug>) ------------------ */
  function setUpCaseStudy() {
    var box = $("[data-case-study]");
    if (!box || box.getAttribute("data-ready")) return;
    box.setAttribute("data-ready", "1");
    var slug = param("p");
    var notFound = '<div class="wrap section"><p>We couldn\'t find that case study. <a class="text-link" href="projects.html">See all projects</a></p></div>';
    if (!/^[a-z0-9-]{3,80}$/.test(slug)) { box.innerHTML = notFound; return; }
    api("projects?select=*&published=eq.true&case_study=eq.true&slug=eq." + encodeURIComponent(slug)).then(function (rows) {
      var p = rows[0];
      if (!p) { box.innerHTML = notFound; return; }
      setMeta(p.name + ", " + p.city, p.challenge.slice(0, 155));
      var results = Array.isArray(p.results) ? p.results : [];
      box.innerHTML =
        '<section class="page-intro"><div class="wrap">' +
          '<p class="crumb"><a href="index.html">Home</a> / <a href="projects.html">Projects</a> / Case study</p>' +
          '<div class="intro-text"><h1>' + esc(p.name) + "</h1><p>" + esc(p.sector) + ", " + esc(p.city) + ". " + esc(p.scope) + "</p></div>" +
        "</div></section>" +
        (p.photo_url ? '<div class="wrap page-image"><img src="' + esc(p.photo_url) + '" alt="' + esc(p.name) + '"></div>' : "") +
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
          (results.length ? '<h2 class="case-results-title">Results</h2><dl class="figures case-results">' + results.map(function (r) {
            return "<div><dt>" + esc(r.label) + "</dt><dd>" + esc(r.value) + "</dd></div>";
          }).join("") + "</dl>" : "") +
        "</div></section>" +
        (p.quote ? '<section class="section surface"><div class="wrap"><figure class="testimonial"><blockquote><p>' + esc(p.quote) +
          "</p></blockquote><figcaption><b>" + esc(p.quote_by) + "</b></figcaption></figure></div></section>" : "") +
        '<section class="section"><div class="wrap closing"><div><h2>Planning something similar?</h2>' +
          "<p>Tell us about your project and we will share how we would approach it.</p></div>" +
          '<div><a class="btn" href="contact.html">Discuss your project</a></div></div></section>';
    }).catch(function () { box.innerHTML = notFound; });
  }

  /* ---- Insights list and articles ---------------------------------- */
  function postCard(p) {
    var href = "article.html?p=" + encodeURIComponent(p.slug);
    return '<article class="post-card">' +
      (p.cover_url ? '<a href="' + href + '" tabindex="-1" aria-hidden="true"><img src="' + esc(p.cover_url) + '" alt="" loading="lazy"></a>' : "") +
      '<p class="post-date">' + esc(prettyDate(p.published_at)) + "</p>" +
      '<h2><a href="' + href + '">' + esc(p.title) + "</a></h2><p>" + esc(p.excerpt) + "</p>" +
      '<a class="text-link" href="' + href + '">Read the article</a></article>';
  }
  function setUpInsights() {
    $all("[data-posts]").forEach(function (el) {
      if (el.getAttribute("data-ready")) return;
      el.setAttribute("data-ready", "1");
      var limit = parseInt(el.getAttribute("data-posts"), 10) || 50;
      api("posts?select=slug,title,excerpt,cover_url,published_at&published=eq.true&order=published_at.desc&limit=" + limit).then(function (rows) {
        el.innerHTML = rows.length ? rows.map(postCard).join("") : "<p>New articles are on their way.</p>";
      }).catch(function () { el.innerHTML = "<p>Articles couldn't be loaded just now. Please try again later.</p>"; });
    });
  }
  function setUpArticle() {
    var box = $("[data-article]");
    if (!box || box.getAttribute("data-ready")) return;
    box.setAttribute("data-ready", "1");
    var slug = param("p");
    var notFound = '<div class="wrap section"><p>We couldn\'t find that article. <a class="text-link" href="insights.html">See all insights</a></p></div>';
    if (!/^[a-z0-9-]{3,80}$/.test(slug)) { box.innerHTML = notFound; return; }
    api("posts?select=*&published=eq.true&slug=eq." + encodeURIComponent(slug)).then(function (rows) {
      var p = rows[0];
      if (!p) { box.innerHTML = notFound; return; }
      setMeta(p.title, p.excerpt);
      box.innerHTML =
        '<section class="page-intro"><div class="wrap">' +
          '<p class="crumb"><a href="index.html">Home</a> / <a href="insights.html">Insights</a></p>' +
          '<h1 class="article-title">' + esc(p.title) + "</h1>" +
          '<p class="post-date">' + esc(prettyDate(p.published_at)) + ", " + esc(p.author) + "</p>" +
        "</div></section>" +
        (p.cover_url ? '<div class="wrap page-image"><img src="' + esc(p.cover_url) + '" alt=""></div>' : "") +
        '<section class="section"><div class="wrap"><div class="article-body">' + markdown(p.body) + "</div></div></section>" +
        '<section class="section surface"><div class="wrap"><div class="head-row"><h2>More insights</h2><a class="text-link" href="insights.html">All insights</a></div>' +
        '<div class="post-grid" data-more-posts></div></div></section>';
      api("posts?select=slug,title,excerpt,cover_url,published_at&published=eq.true&slug=neq." + encodeURIComponent(slug) + "&order=published_at.desc&limit=2").then(function (more) {
        var el = $("[data-more-posts]");
        if (el) el.innerHTML = more.map(postCard).join("");
      }).catch(function () {});
    }).catch(function () { box.innerHTML = notFound; });
  }

  /* ---- Careers ------------------------------------------------------ */
  function setUpCareers(S) {
    var list = $("[data-jobs]");
    if (!list || list.getAttribute("data-ready")) return;
    list.setAttribute("data-ready", "1");
    var jobs = S.jobs || [];
    list.innerHTML = jobs.length ? jobs.map(function (j) {
      return '<article class="job"><div><h3>' + esc(j.title) + "</h3><p>" + esc(j.summary) + "</p></div>" +
        '<dl><div><dt>Location</dt><dd>' + esc(j.location) + "</dd></div><div><dt>Experience</dt><dd>" + esc(j.experience) +
        "</dd></div><div><dt>Type</dt><dd>" + esc(j.type) + "</dd></div></dl></article>";
    }).join("") : "<p>No open roles right now. Send us your details anyway and we'll keep them on file.</p>";
    var role = $("#job-role");
    jobs.forEach(function (j) { var o = document.createElement("option"); o.value = j.title; o.textContent = j.title + ", " + j.location; role.appendChild(o); });
    var o2 = document.createElement("option"); o2.value = "Other / future roles"; o2.textContent = "Other / future roles"; role.appendChild(o2);

    var form = $("#job-form"), status = $("#job-status"), btn = $("button[type=submit]", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = validLead(form, "job");
      if (!v) return;
      var link = $("#job-link").value.trim();
      if (link && !/^https:\/\//.test(link)) { $("#job-link").setAttribute("aria-invalid", "true"); $("#job-link-error").textContent = "Paste a full link starting with https://"; $("#job-link").focus(); return; }
      if ($("#job-website").value) { form.reset(); status.hidden = false; status.textContent = "Thank you. We have received your application."; return; }
      btn.disabled = true;
      api("enquiries", { method: "POST", body: {
        name: v.name, phone: v.phone, email: v.email, source: "career",
        sector: role.value || "Not specified", city: $("#job-city").value.trim(),
        stage: $("#job-exp").value.trim() ? $("#job-exp").value.trim() + " years experience" : "",
        message: ($("#job-message").value.trim() || "Job application") + (link ? "\n\nCV / LinkedIn: " + link : ""),
      } }).then(function () {
        form.reset();
        status.hidden = false;
        status.textContent = "Thank you, " + v.name + ". We have received your application and will contact you if there's a fit.";
        status.focus();
      }).catch(function () {
        status.hidden = false;
        status.textContent = "We couldn't send your application just now. Please try again in a few minutes.";
      }).then(function () { btn.disabled = false; });
    });
  }

  /* ---- Cost and fee estimator -------------------------------------- */
  function setUpEstimator() {
    var form = $("#estimate-form");
    var E = CFG.estimator;
    if (!form || !E || form.getAttribute("data-ready")) return;
    form.setAttribute("data-ready", "1");
    function fill(sel, items) { items.forEach(function (it) { var o = document.createElement("option"); o.value = it.id; o.textContent = it.label; sel.appendChild(o); }); }
    fill($("#est-type"), E.types); fill($("#est-city"), E.cities); fill($("#est-spec"), E.specs);
    $("#est-spec").value = "premium";
    var out = $("#estimate-result"), last = null;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var area = parseFloat(String($("#est-area").value).replace(/[, ]/g, ""));
      var err = $("#est-area-error");
      err.textContent = "";
      $("#est-area").removeAttribute("aria-invalid");
      if (!(area >= 500 && area <= 5000000)) { err.textContent = "Enter a built-up area between 500 and 50,00,000 sq ft."; $("#est-area").setAttribute("aria-invalid", "true"); $("#est-area").focus(); return; }
      var type = E.types.filter(function (t) { return t.id === $("#est-type").value; })[0];
      var city = E.cities.filter(function (c) { return c.id === $("#est-city").value; })[0];
      var spec = $("#est-spec").value;
      var r = type.rates[spec];
      var lo = r[0] * city.factor * area, hi = r[1] * city.factor * area;
      var feeLo = lo * E.pmcFee[0], feeHi = hi * E.pmcFee[1];
      last = { type: type.label, city: city.label, spec: spec, area: area, lo: lo, hi: hi, feeLo: feeLo, feeHi: feeHi };
      $("#est-cost").textContent = money(lo) + " to " + money(hi);
      $("#est-rate").textContent = "₹" + Math.round(r[0] * city.factor).toLocaleString("en-IN") + " to ₹" + Math.round(r[1] * city.factor).toLocaleString("en-IN") + " per sq ft";
      $("#est-fee").textContent = money(feeLo) + " to " + money(feeHi);
      out.hidden = false;
      out.focus();
    });

    var lead = $("#estimate-lead"), status = $("#estimate-status"), btn = $("button[type=submit]", lead);
    lead.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = validLead(lead, "el");
      if (!v || !last) return;
      if ($("#el-website").value) { lead.reset(); status.hidden = false; status.textContent = "Thank you. We will be in touch."; return; }
      btn.disabled = true;
      api("enquiries", { method: "POST", body: {
        name: v.name, phone: v.phone, email: v.email, source: "estimator",
        sector: last.type, city: last.city.split(" (")[0], area: Math.round(last.area).toLocaleString("en-IN") + " sq ft",
        stage: "Used the cost estimator",
        message: "Estimate shown: construction " + money(last.lo) + " to " + money(last.hi) + " (" + last.spec + "), PMC fee " +
          money(last.feeLo) + " to " + money(last.feeHi) + ". Wants a detailed estimate." +
          ($("#el-note").value.trim() ? "\n\n" + $("#el-note").value.trim() : ""),
      } }).then(function () {
        lead.reset();
        status.hidden = false;
        status.textContent = "Thank you, " + v.name + ". We'll call within one working day to understand your project and prepare a proper estimate.";
        status.focus();
      }).catch(function () {
        status.hidden = false;
        status.textContent = "We couldn't send this just now. Please call or WhatsApp us instead.";
      }).then(function () { btn.disabled = false; });
    });
  }

  /* ---- Free resources (download after a short form) ---------------- */
  var VISITOR_KEY = "avspmc-visitor";
  function rememberedVisitor() {
    try { return JSON.parse(localStorage.getItem(VISITOR_KEY) || "null"); } catch (e) { return null; }
  }
  function rememberVisitor(v) {
    try { localStorage.setItem(VISITOR_KEY, JSON.stringify(v)); } catch (e) { /* private mode: ask again next time */ }
  }
  function startDownload(res) {
    var a = document.createElement("a");
    a.href = res.file;
    a.download = res.file.split("/").pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function logDownload(res, v) {
    return api("enquiries", { method: "POST", body: {
      name: v.name, phone: v.phone, email: v.email || "",
      source: "resource:" + res.slug, stage: "Downloaded a resource",
      message: "Downloaded: " + res.title,
    } });
  }
  function setUpResources() {
    var list = CFG.resources || [];
    // Home page teaser: titles only.
    $all("[data-resource-list]").forEach(function (el) {
      el.innerHTML = list.map(function (r) {
        return '<li><a href="resources.html#' + esc(r.slug) + '">' + esc(r.title) + "</a><span>" + esc(r.format) + "</span></li>";
      }).join("");
    });
    var grid = $("[data-resources]");
    if (!grid || grid.getAttribute("data-ready")) return;
    grid.setAttribute("data-ready", "1");
    grid.innerHTML = list.map(function (r) {
      return '<article class="resource" id="' + esc(r.slug) + '">' +
        '<p class="resource-kind"><b>' + esc(r.format) + "</b>, " + esc(r.size) + ". " + esc(r.audience) + "</p>" +
        "<h2>" + esc(r.title) + "</h2><p>" + esc(r.description) + "</p>" +
        "<ul>" + (r.points || []).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
        '<button class="btn" type="button" data-download="' + esc(r.slug) + '">Download ' + esc(r.format) + "</button>" +
        '<p class="resource-done" aria-live="polite"></p></article>';
    }).join("");

    var dialog = $("#download-dialog");
    var form = $("#download-form");
    var current = null;
    function find(slug) { return list.filter(function (r) { return r.slug === slug; })[0]; }
    function done(res) {
      var card = document.getElementById(res.slug);
      if (card) $(".resource-done", card).textContent = "Your download has started. Check your downloads folder.";
    }

    grid.addEventListener("click", function (e) {
      var b = e.target.closest("[data-download]");
      if (!b) return;
      var res = find(b.getAttribute("data-download"));
      var known = rememberedVisitor();
      if (known && known.name && known.phone) {
        startDownload(res);
        logDownload(res, known).catch(function () {});
        done(res);
        return;
      }
      current = res;
      $("#dl-title").textContent = res.title;
      $("#dl-format").textContent = res.format + ", " + res.size;
      $all(".field-error", form).forEach(function (x) { x.textContent = ""; });
      $all("[aria-invalid]", form).forEach(function (x) { x.removeAttribute("aria-invalid"); });
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
      $("#dl-name").focus();
    });
    $all("[data-close]", dialog).forEach(function (b) {
      b.addEventListener("click", function () { dialog.close ? dialog.close() : dialog.removeAttribute("open"); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = { name: $("#dl-name").value.trim(), phone: $("#dl-phone").value.trim(), email: $("#dl-email").value.trim() };
      var ok = true;
      function fail(id, msg) {
        var f = $("#" + id);
        f.setAttribute("aria-invalid", "true");
        $("#" + id + "-error").textContent = msg;
        if (ok) f.focus();
        ok = false;
      }
      $all(".field-error", form).forEach(function (x) { x.textContent = ""; });
      $all("[aria-invalid]", form).forEach(function (x) { x.removeAttribute("aria-invalid"); });
      if (!v.name) fail("dl-name", "Enter your name.");
      if (!/^[+\d][\d\s-]{7,}$/.test(v.phone)) fail("dl-phone", "Enter a phone number with at least 8 digits.");
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) fail("dl-email", "Check the email address, or leave it blank.");
      if (!ok || !current) return;
      var res = current;
      if (!$("#dl-website").value) {
        rememberVisitor(v);
        logDownload(res, v).catch(function () {});
      }
      // The download never waits on the database.
      startDownload(res);
      dialog.close ? dialog.close() : dialog.removeAttribute("open");
      done(res);
    });

    // Opened from a link like resources.html#project-health-check: highlight that card.
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  /* ---- Projects --------------------------------------------------- */
  function statusLine(p) {
    return p.status === "Ongoing"
      ? '<span class="status status-ongoing">Ongoing, ' + esc(p.progress) + "% complete</span>"
      : '<span class="status status-done">Completed</span>';
  }
  function projectFigure(p, withFacts) {
    var href = p.caseStudy ? "case-study.html?p=" + encodeURIComponent(p.slug) : "";
    var photo = p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + ", " + esc(p.city) + '" loading="lazy">' : "";
    return '<article class="project" data-sector="' + esc(p.sector) + '">' +
      (href ? '<a class="project-photo-link" href="' + href + '" tabindex="-1" aria-hidden="true">' + photo + "</a>" : photo) +
      '<div class="project-caption">' +
        "<div><h3>" + (href ? '<a href="' + href + '">' + esc(p.name) + "</a>" : esc(p.name)) + "</h3><p>" + esc(p.sector) + ", " + esc(p.city) +
        (href ? ' <a class="case-link" href="' + href + '">Read the case study</a>' : "") + "</p></div>" +
        '<div class="project-meta">' + statusLine(p) + (withFacts ? "" : esc(p.area)) + "</div>" +
      "</div>" +
      (withFacts
        ? "<p>" + esc(p.scope) + "</p>" +
          '<dl class="project-facts">' +
            "<div><dt>Client</dt><dd>" + esc(p.client) + "</dd></div>" +
            "<div><dt>Area</dt><dd>" + esc(p.area) + "</dd></div>" +
            "<div><dt>Project cost</dt><dd>" + esc(p.value) + "</dd></div>" +
          "</dl>"
        : "") +
      "</article>";
  }
  function renderProjects(S) {
    var projects = S.projects || [];
    $all("[data-projects]").forEach(function (el) {
      var mode = el.getAttribute("data-projects");
      var list;
      if (mode === "lead") list = projects.filter(function (p) { return p.featured === "lead"; }).slice(0, 1);
      else if (mode === "pair") list = projects.filter(function (p) { return p.featured === true; }).slice(0, 2);
      else list = projects;
      el.innerHTML = list.map(function (p) { return projectFigure(p, mode === "all"); }).join("");
    });
  }

  function setUpFilter(S) {
    var bar = $("#filter-bar");
    if (!bar) return;
    var current = new URLSearchParams(location.search).get("sector") || "";
    var options = [""].concat(S.sectors || []);
    bar.innerHTML = options.map(function (s) {
      return '<button type="button" data-value="' + esc(s) + '">' + esc(s || "All projects") + "</button>";
    }).join("") + '<p class="filter-count" aria-live="polite"></p>';
    var count = $(".filter-count", bar);
    function apply(value) {
      $all("button", bar).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === value)); });
      var shown = 0;
      $all("[data-projects] .project").forEach(function (card) {
        var ok = !value || card.getAttribute("data-sector") === value;
        card.hidden = !ok;
        if (ok) shown++;
      });
      count.textContent = shown === 1 ? "1 project" : shown + " projects";
      $("#filter-empty").hidden = shown !== 0;
    }
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) apply(b.getAttribute("data-value"));
    });
    apply(options.indexOf(current) > -1 ? current : "");
  }

  /* ---- Contact form: saves the enquiry to the CRM ------------------ */
  function setUpForm(S) {
    var form = $("#enquiry-form");
    if (!form || form.getAttribute("data-ready")) return;
    form.setAttribute("data-ready", "1");
    var K = S.contact || {};
    var sectorField = $("#f-sector", form);
    (S.sectors || []).forEach(function (s) {
      var o = document.createElement("option"); o.value = s; o.textContent = s; sectorField.appendChild(o);
    });
    function val(id) { return ($("#" + id, form).value || "").trim(); }
    function fields() {
      return {
        name: val("f-name"), phone: val("f-phone"), email: val("f-email"), city: val("f-city"),
        sector: val("f-sector"), area: val("f-area"), stage: val("f-stage"), message: val("f-message"),
      };
    }
    function asText(f) {
      return [
        "Name: " + f.name, "Phone: " + f.phone, "Email: " + (f.email || "Not given"),
        "Project type: " + (f.sector || "Not specified"), "City: " + (f.city || "Not specified"),
        "Approx. built-up area: " + (f.area || "Not specified"), "Current stage: " + (f.stage || "Not specified"),
        "", f.message,
      ].join("\n");
    }
    function validate() {
      var ok = true;
      $all(".field-error", form).forEach(function (e) { e.textContent = ""; });
      $all("[aria-invalid]", form).forEach(function (e) { e.removeAttribute("aria-invalid"); });
      function fail(id, msg) {
        var f = $("#" + id, form);
        f.setAttribute("aria-invalid", "true");
        $("#" + id + "-error", form).textContent = msg;
        if (ok) f.focus();
        ok = false;
      }
      if (!val("f-name")) fail("f-name", "Enter your name so we know who to reply to.");
      if (!/^[+\d][\d\s-]{7,}$/.test(val("f-phone"))) fail("f-phone", "Enter a phone number with at least 8 digits.");
      if (val("f-email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("f-email"))) fail("f-email", "Check the email address, or leave it blank.");
      if (!val("f-message")) fail("f-message", "Tell us a little about the project.");
      return ok;
    }
    var statusBox = $("#form-status");
    var submit = $("button[type=submit]", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      var f = fields();
      // Hidden field that only bots fill in.
      if (val("f-website")) { form.reset(); statusBox.hidden = false; statusBox.textContent = "Thank you. We have received your enquiry."; return; }
      submit.disabled = true;
      submit.textContent = "Sending…";
      api("enquiries", { method: "POST", body: f }).then(function () {
        form.reset();
        statusBox.hidden = false;
        statusBox.textContent = "Thank you, " + f.name + ". We have received your enquiry and will reply within one working day.";
        statusBox.focus();
      }).catch(function () {
        statusBox.hidden = false;
        statusBox.innerHTML = "We couldn't send your enquiry just now. Please <a href=\"mailto:" + esc(K.email) + "?subject=" +
          encodeURIComponent("Project enquiry") + "&body=" + encodeURIComponent(asText(f)) + "\">send it by email</a> or use WhatsApp instead.";
      }).then(function () {
        submit.disabled = false;
        submit.textContent = "Send enquiry";
      });
    });
    $("#send-whatsapp", form).addEventListener("click", function () {
      if (!validate()) return;
      var f = fields();
      window.open("https://wa.me/" + K.whatsapp + "?text=" + encodeURIComponent("Project enquiry\n" + asText(f)), "_blank", "noopener");
      // Also keep a copy in the CRM, so WhatsApp enquiries aren't lost.
      if (!val("f-website")) api("enquiries", { method: "POST", body: Object.assign({}, f, { source: "whatsapp", stage: f.stage || "Sent on WhatsApp" }) }).catch(function () {});
    });
  }

  loadContent().then(render);
})();

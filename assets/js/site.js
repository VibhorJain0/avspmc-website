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
    { id: "resources", href: "resources.html", label: "Resources" },
    { id: "contact",  href: "contact.html",  label: "Contact" },
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
        };
      }),
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
            NAV.map(function (l) { return '<li><a href="' + l.href + '">' + l.label + "</a></li>"; }).join("") +
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
        '<p><a href="privacy.html">Privacy policy</a></p><p>' + esc(K.hours) + "</p></div>";
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
    return '<article class="project" data-sector="' + esc(p.sector) + '">' +
      (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + ", " + esc(p.city) + '" loading="lazy">' : "") +
      '<div class="project-caption">' +
        "<div><h3>" + esc(p.name) + "</h3><p>" + esc(p.sector) + ", " + esc(p.city) + "</p></div>" +
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

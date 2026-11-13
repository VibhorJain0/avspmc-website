/* =====================================================================
   AVSPMC — SITE BEHAVIOUR
   You should not need to edit this file. Content lives in
   site-data.js and colours/fonts in ../css/tokens.css.
   ===================================================================== */
(function () {
  "use strict";
  var S = window.SITE || {};
  var C = S.company || {};
  var K = S.contact || {};
  var page = document.body.getAttribute("data-page") || "";

  var NAV = [
    { id: "about",    href: "about.html",    label: "About" },
    { id: "services", href: "services.html", label: "Services" },
    { id: "sectors",  href: "sectors.html",  label: "Sectors" },
    { id: "projects", href: "projects.html", label: "Projects" },
    { id: "contact",  href: "contact.html",  label: "Contact" },
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---- Logo (a wordmark drawn from site-data.js) ------------------ */
  function logo(extraClass) {
    var name = (C.logoBold || "") + (C.logoLight || "");
    return '<a class="logo ' + (extraClass || "") + '" href="index.html" aria-label="' + esc(name) + ', home">' +
      '<span class="logo-word"><b>' + esc(C.logoBold) + "</b><span>" + esc(C.logoLight) + "</span></span></a>";
  }

  /* ---- Sample-content notice -------------------------------------- */
  if (S.showSampleNotice) {
    var n = document.createElement("div");
    n.className = "sample-notice";
    n.textContent = "Sample content: projects, figures and contact details are placeholders. Edit assets/js/site-data.js to replace them.";
    document.body.insertBefore(n, document.body.firstChild);
  }

  /* ---- Header ----------------------------------------------------- */
  var header = $("#site-header");
  if (header) {
    header.innerHTML =
      '<div class="wrap header-inner">' + logo() +
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

  /* ---- Footer ----------------------------------------------------- */
  var footer = $("#site-footer");
  if (footer) {
    footer.innerHTML =
      '<div class="wrap footer-grid">' +
        '<div class="footer-brand">' + logo("logo-light") + "<p>" + esc(C.tagline) + "</p></div>" +
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
      '<div class="wrap footer-base"><p>© ' + new Date().getFullYear() + " " + esc(C.legalName) + "</p><p>" + esc(K.hours) + "</p></div>";
  }

  /* ---- Fill text slots: <span data-fill="contact.email"> ---------- */
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

  /* ---- Figures ---------------------------------------------------- */
  $all("[data-stats]").forEach(function (el) {
    el.innerHTML = (S.stats || []).map(function (s) {
      return "<div><dt>" + esc(s.label) + "</dt><dd>" + esc(s.value) + "</dd></div>";
    }).join("");
  });

  /* ---- Testimonial ------------------------------------------------- */
  $all("[data-testimonial]").forEach(function (el) {
    var t = (S.testimonials || [])[0];
    if (!t) { el.closest("section").hidden = true; return; }
    el.innerHTML = "<blockquote><p>" + esc(t.quote) + "</p></blockquote>" +
      "<figcaption><b>" + esc(t.name) + "</b>" + esc(t.org) + "</figcaption>";
  });

  /* ---- Projects --------------------------------------------------- */
  function statusLine(p) {
    return p.status === "Ongoing"
      ? '<span class="status status-ongoing">Ongoing, ' + esc(p.progress) + "% complete</span>"
      : '<span class="status status-done">Completed</span>';
  }
  function projectFigure(p, withFacts) {
    return '<article class="project" data-sector="' + esc(p.sector) + '">' +
      '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + ", " + esc(p.city) + '" loading="lazy">' +
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
  var projects = S.projects || [];
  $all("[data-projects]").forEach(function (el) {
    var mode = el.getAttribute("data-projects");
    var list;
    if (mode === "lead") list = projects.filter(function (p) { return p.featured === "lead"; }).slice(0, 1);
    else if (mode === "pair") list = projects.filter(function (p) { return p.featured === true; }).slice(0, 2);
    else list = projects;
    el.innerHTML = list.map(function (p) { return projectFigure(p, mode === "all"); }).join("");
  });

  /* ---- Project filter (projects page) ----------------------------- */
  var bar = $("#filter-bar");
  if (bar) {
    var current = new URLSearchParams(location.search).get("sector") || "";
    var options = [""].concat(S.sectors || []);
    bar.innerHTML = options.map(function (s) {
      return '<button type="button" data-value="' + esc(s) + '">' + esc(s || "All projects") + "</button>";
    }).join("") + '<p class="filter-count" aria-live="polite"></p>';
    var count = $(".filter-count", bar);
    function apply(value) {
      current = value;
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

  /* ---- Contact form ----------------------------------------------- */
  var form = $("#enquiry-form");
  if (form) {
    var sectorField = $("#f-sector", form);
    (S.sectors || []).forEach(function (s) {
      var o = document.createElement("option"); o.value = s; o.textContent = s; sectorField.appendChild(o);
    });
    function val(id) { return ($("#" + id, form).value || "").trim(); }
    function buildMessage() {
      return [
        "Name: " + val("f-name"),
        "Phone: " + val("f-phone"),
        "Email: " + (val("f-email") || "Not given"),
        "Project type: " + (val("f-sector") || "Not specified"),
        "City: " + (val("f-city") || "Not specified"),
        "Approx. built-up area: " + (val("f-area") || "Not specified"),
        "Current stage: " + (val("f-stage") || "Not specified"),
        "",
        val("f-message"),
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
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      var subject = "Project enquiry: " + (val("f-sector") || "building project") + (val("f-city") ? " in " + val("f-city") : "");
      location.href = "mailto:" + K.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(buildMessage());
      statusBox.hidden = false;
      statusBox.innerHTML = "Your email app should now be open with the enquiry filled in. Press send there. If nothing opened, write to <a href=\"mailto:" + esc(K.email) + "\">" + esc(K.email) + "</a>.";
    });
    $("#send-whatsapp", form).addEventListener("click", function () {
      if (!validate()) return;
      window.open("https://wa.me/" + K.whatsapp + "?text=" + encodeURIComponent("Project enquiry\n" + buildMessage()), "_blank", "noopener");
    });
  }
})();

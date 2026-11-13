/* =====================================================================
   AVSPMC ADMIN — enquiries (CRM), projects and site content (CMS).
   Only accounts listed in the database's `admins` table can read
   enquiries or change content; the database enforces this.
   ===================================================================== */
(function () {
  "use strict";
  var CFG = window.AVS_CONFIG;
  // Invitation and password-reset emails link back here with details in
  // the address; read them before the Supabase client tidies the URL.
  var linkInfo = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  var linkType = linkInfo.get("type");               // "invite" or "recovery"
  var linkError = linkInfo.get("error_description");  // e.g. expired link
  var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
  var SECTORS = CFG.sectors || [];
  var STATUSES = [
    { id: "new", label: "New" },
    { id: "contacted", label: "Contacted" },
    { id: "proposal", label: "Proposal sent" },
    { id: "won", label: "Won" },
    { id: "lost", label: "Lost" },
  ];
  var FEATURED = [
    { id: "lead", label: "Home page, large (lead)" },
    { id: "yes", label: "Home page, small" },
    { id: "no", label: "Projects page only" },
  ];

  var state = { enquiries: [], projects: [], filter: "new", search: "", enquiryId: null, projectId: null };

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function statusLabel(id) { var s = STATUSES.filter(function (x) { return x.id === id; })[0]; return s ? s.label : id; }
  function pill(id) { return '<span class="pill pill-' + esc(id) + '">' + esc(statusLabel(id)) + "</span>"; }
  function when(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ", " +
      d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  }
  // Where a lead came from, in words.
  function sourceLabel(e) {
    var s = e.source || "contact";
    if (s.indexOf("resource:") === 0) {
      var slug = s.slice(9);
      var r = (CFG.resources || []).filter(function (x) { return x.slug === slug; })[0];
      return "Download: " + (r ? r.title : slug);
    }
    if (s === "estimator") return "Cost estimator";
    if (s === "career") return "Job application";
    return s === "whatsapp" ? "Contact form, sent on WhatsApp" : "Contact form";
  }
  function isDownload(e) { return (e.source || "").indexOf("resource:") === 0; }
  function img(url) { return !url ? "" : /^https?:\/\//.test(url) ? url : "../" + url; }
  function digits(s) { return String(s || "").replace(/\D/g, ""); }

  var toastTimer;
  function toast(msg, bad) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("bad", !!bad);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }
  // Two-step delete button, so there are no browser pop-ups.
  function armDelete(btn, onConfirm) {
    btn.addEventListener("click", function () {
      if (btn.classList.contains("armed")) { onConfirm(); return; }
      btn.classList.add("armed");
      btn.textContent = "Click again to delete";
      setTimeout(function () { btn.classList.remove("armed"); btn.textContent = "Delete"; }, 4000);
    });
  }

  /* ---- Auth -------------------------------------------------------- */
  function show(view) {
    ["login-view", "password-view", "denied-view", "app-view"].forEach(function (id) { $("#" + id).hidden = id !== view; });
  }
  function start(session) {
    if (!session) { show("login-view"); return; }
    var user = session.user;
    if (linkType === "invite" || linkType === "recovery") {
      $("#password-email").textContent = user.email;
      show("password-view");
      $("#new-password").focus();
      return;
    }
    sb.from("admins").select("user_id").eq("user_id", user.id).then(function (res) {
      if (res.error || !res.data || !res.data.length) {
        $("#denied-email").textContent = user.email;
        show("denied-view");
        return;
      }
      $("#user-email").textContent = user.email;
      show("app-view");
      loadEnquiries();
      watchEnquiries();
      loadProjects();
      loadSettings();
      loadPosts();
    });
  }
  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("button", e.target);
    var err = $("#login-error");
    err.textContent = "";
    btn.disabled = true;
    sb.auth.signInWithPassword({ email: $("#login-email").value.trim(), password: $("#login-password").value })
      .then(function (res) {
        btn.disabled = false;
        if (res.error) { err.textContent = "That email and password didn't match. Check them and try again."; return; }
        $("#login-password").value = "";
        start(res.data.session);
      });
  });
  $("#forgot-password").addEventListener("click", function () {
    var email = $("#login-email").value.trim();
    var err = $("#login-error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = "Enter your email above first, then click this link."; $("#login-email").focus(); return; }
    sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function (res) {
      err.textContent = res.error
        ? "Couldn't send the email just now. Wait a minute and try again."
        : "If that email has an admin account, a link to set a new password is on its way.";
    });
  });

  $("#password-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var p1 = $("#new-password").value, p2 = $("#confirm-password").value;
    var err = $("#password-error");
    err.textContent = "";
    if (p1.length < 8) { err.textContent = "Use at least 8 characters."; return; }
    if (p1 !== p2) { err.textContent = "The two passwords don't match."; return; }
    var btn = $("button", e.target);
    btn.disabled = true;
    sb.auth.updateUser({ password: p1 }).then(function (res) {
      btn.disabled = false;
      if (res.error) { err.textContent = "Couldn't save the password: " + res.error.message; return; }
      e.target.reset();
      linkType = null;
      toast("Password saved");
      sb.auth.getSession().then(function (r) { start(r.data.session); });
    });
  });

  $all("[data-signout]").forEach(function (b) {
    b.addEventListener("click", function () { sb.auth.signOut().then(function () { show("login-view"); }); });
  });
  if (linkError) $("#login-error").textContent = "That link didn't work (" + linkError.replace(/\+/g, " ") + "). Ask for a new one.";
  sb.auth.getSession().then(function (res) { start(res.data.session); });

  /* ---- Tabs -------------------------------------------------------- */
  $all(".tabs button").forEach(function (tab) {
    tab.addEventListener("click", function () {
      $all(".tabs button").forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
      $all(".panel").forEach(function (p) { p.hidden = p.id !== "tab-" + tab.getAttribute("data-tab"); });
    });
  });

  /* ---- CRM: enquiries ---------------------------------------------- */
  function loadEnquiries() {
    sb.from("enquiries").select("*").order("created_at", { ascending: false }).then(function (res) {
      if (res.error) { toast("Couldn't load enquiries.", true); return; }
      state.enquiries = res.data;
      renderEnquiries();
    });
  }
  // Live alerts while the admin page is open.
  var watching = false;
  function watchEnquiries() {
    if (watching) return;
    watching = true;
    sb.channel("new-enquiries")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "enquiries" }, function (payload) {
        var e = payload.new;
        if (state.enquiries.some(function (x) { return x.id === e.id; })) return;
        state.enquiries.unshift(e);
        renderEnquiries();
        toast((isDownload(e) ? "New download lead: " : "New enquiry from ") + e.name);
        if (window.Notification && Notification.permission === "granted") {
          var n = new Notification("New AVSPMC enquiry", {
            body: e.name + (e.sector ? ", " + e.sector : "") + (e.city ? ", " + e.city : ""),
            icon: "../assets/img/favicon.svg",
          });
          n.onclick = function () { window.focus(); state.enquiryId = e.id; renderEnquiries(); renderEnquiryDetail(); };
        }
      })
      .subscribe();
    var btn = $("#desktop-alerts");
    if (window.Notification && Notification.permission === "default") {
      btn.hidden = false;
      btn.addEventListener("click", function () {
        Notification.requestPermission().then(function (p) {
          btn.hidden = true;
          toast(p === "granted" ? "Desktop alerts on" : "Desktop alerts stay off (you can change this in browser settings)");
        });
      });
    }
  }

  function renderEnquiries() {
    var counts = { all: state.enquiries.length };
    STATUSES.forEach(function (s) { counts[s.id] = 0; });
    state.enquiries.forEach(function (e) { counts[e.status] = (counts[e.status] || 0) + 1; });
    var badge = $("#new-count");
    badge.textContent = counts.new;
    badge.hidden = !counts.new;
    document.title = (counts.new ? "(" + counts.new + ") " : "") + "Admin | AVSPMC";

    $("#status-filter").innerHTML = [{ id: "all", label: "All" }].concat(STATUSES).map(function (s) {
      return '<button type="button" data-status="' + s.id + '" aria-pressed="' + (state.filter === s.id) + '">' +
        esc(s.label) + " (" + (counts[s.id] || 0) + ")</button>";
    }).join("");

    var q = state.search.toLowerCase();
    var rows = state.enquiries.filter(function (e) {
      if (state.filter !== "all" && e.status !== state.filter) return false;
      if (!q) return true;
      return [e.name, e.phone, e.email, e.city, e.sector, e.message, sourceLabel(e)].join(" ").toLowerCase().indexOf(q) > -1;
    });
    $("#enquiry-rows").innerHTML = rows.map(function (e) {
      return '<tr data-id="' + e.id + '" class="' + (e.status === "new" ? "is-new " : "") + (e.id === state.enquiryId ? "selected" : "") + '">' +
        "<td>" + esc(when(e.created_at)) + "</td>" +
        "<td>" + esc(e.name) + '<span class="sub">' + esc(e.phone) + "</span></td>" +
        "<td>" + esc(isDownload(e) ? sourceLabel(e) : (e.sector || "Not specified")) + '<span class="sub">' + esc(isDownload(e) ? "Resource download" : e.city) + "</span></td>" +
        "<td>" + pill(e.status) + "</td></tr>";
    }).join("");
    $("#enquiry-empty").hidden = rows.length > 0;
  }
  $("#status-filter").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    state.filter = b.getAttribute("data-status");
    renderEnquiries();
  });
  $("#enquiry-search").addEventListener("input", function (e) { state.search = e.target.value; renderEnquiries(); });
  $("#enquiry-rows").addEventListener("click", function (e) {
    var tr = e.target.closest("tr");
    if (!tr) return;
    state.enquiryId = tr.getAttribute("data-id");
    renderEnquiries();
    renderEnquiryDetail();
  });

  function renderEnquiryDetail() {
    var e = state.enquiries.filter(function (x) { return x.id === state.enquiryId; })[0];
    var box = $("#enquiry-detail");
    if (!e) { box.innerHTML = '<p class="empty">Select an enquiry to see the details.</p>'; return; }
    var wa = digits(e.phone);
    if (wa.length === 10) wa = "91" + wa;
    box.innerHTML =
      "<h2>" + esc(e.name) + "</h2>" +
      '<p class="meta">Received ' + esc(when(e.created_at)) + "</p>" +
      '<div class="quick">' +
        '<a class="btn btn-line" href="tel:' + esc(e.phone) + '">Call</a>' +
        '<a class="btn btn-line" href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' +
        (e.email ? '<a class="btn btn-line" href="mailto:' + esc(e.email) + '">Email</a>' : "") +
      "</div>" +
      "<dl>" +
        "<dt>Came from</dt><dd>" + esc(sourceLabel(e)) + "</dd>" +
        "<dt>Phone</dt><dd>" + esc(e.phone) + "</dd>" +
        "<dt>Email</dt><dd>" + esc(e.email || "Not given") + "</dd>" +
        "<dt>Project type</dt><dd>" + esc(e.sector || "Not specified") + "</dd>" +
        "<dt>City</dt><dd>" + esc(e.city || "Not specified") + "</dd>" +
        "<dt>Built-up area</dt><dd>" + esc(e.area || "Not specified") + "</dd>" +
        "<dt>Stage</dt><dd>" + esc(e.stage || "Not specified") + "</dd>" +
      "</dl>" +
      '<p class="message">' + esc(e.message) + "</p>" +
      '<form id="enquiry-form" class="form-stack">' +
        '<label>Status<select name="status">' + STATUSES.map(function (s) {
          return '<option value="' + s.id + '"' + (s.id === e.status ? " selected" : "") + ">" + esc(s.label) + "</option>";
        }).join("") + "</select></label>" +
        '<label>Notes<textarea name="notes" rows="5" placeholder="Calls, follow-ups, fee quoted…">' + esc(e.notes) + "</textarea></label>" +
        '<div class="actions"><button class="btn" type="submit">Save</button><span class="spacer"></span>' +
        '<button class="btn btn-danger" type="button" id="delete-enquiry">Delete</button></div>' +
      "</form>";

    $("#enquiry-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var f = ev.target;
      var patch = { status: f.status.value, notes: f.notes.value };
      sb.from("enquiries").update(patch).eq("id", e.id).select().then(function (res) {
        if (res.error || !res.data.length) { toast("Couldn't save. Try again.", true); return; }
        Object.assign(e, res.data[0]);
        renderEnquiries();
        toast("Enquiry saved");
      });
    });
    armDelete($("#delete-enquiry"), function () {
      sb.from("enquiries").delete().eq("id", e.id).then(function (res) {
        if (res.error) { toast("Couldn't delete.", true); return; }
        state.enquiries = state.enquiries.filter(function (x) { return x.id !== e.id; });
        state.enquiryId = null;
        renderEnquiries();
        renderEnquiryDetail();
        toast("Enquiry deleted");
      });
    });
  }

  /* ---- CMS: projects ------------------------------------------------ */
  function loadProjects() {
    sb.from("projects").select("*").order("sort_order").order("created_at").then(function (res) {
      if (res.error) { toast("Couldn't load projects.", true); return; }
      state.projects = res.data;
      renderProjectList();
    });
  }
  function featuredLabel(id) { var f = FEATURED.filter(function (x) { return x.id === id; })[0]; return f ? f.label : id; }
  function renderProjectList() {
    $("#project-list").innerHTML = state.projects.map(function (p) {
      return '<button type="button" class="card' + (p.id === state.projectId ? " selected" : "") + '" data-id="' + p.id + '">' +
        (p.photo_url ? '<img src="' + esc(img(p.photo_url)) + '" alt="">' : '<span class="noimg"></span>') +
        "<span><b>" + esc(p.name) + '</b><span class="sub">' + esc(p.sector) + ", " + esc(p.city) + " · order " + esc(p.sort_order) + "</span></span>" +
        '<span class="tags"><span>' + esc(p.status === "Ongoing" ? "Ongoing " + p.progress + "%" : "Completed") + "</span>" +
        "<span>" + esc(p.published ? featuredLabel(p.featured) : "Hidden") + "</span></span></button>";
    }).join("") || '<p class="empty">No projects yet.</p>';
  }
  $("#project-list").addEventListener("click", function (e) {
    var c = e.target.closest(".card");
    if (!c) return;
    state.projectId = c.getAttribute("data-id");
    renderProjectList();
    renderProjectEditor();
  });
  $("#add-project").addEventListener("click", function () {
    state.projectId = "new";
    renderProjectList();
    renderProjectEditor();
  });

  function slugify(s) {
    return String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }
  // Case-study fields inside the project editor.
  function caseStudyFields(p) {
    var r = Array.isArray(p.results) ? p.results.slice(0, 3) : [];
    while (r.length < 3) r.push({ value: "", label: "" });
    return '<fieldset class="sub-fieldset"><legend>Case study page</legend>' +
      '<label class="check"><input type="checkbox" name="case_study"' + (p.case_study ? " checked" : "") + "> Publish a case-study page for this project</label>" +
      '<label>Page address<input name="slug" value="' + esc(p.slug || "") + '" placeholder="e.g. riverside-residences-pune"><small>Lowercase words joined by hyphens. Left empty, it is made from the project name.' +
        (p.slug ? ' Page: <a href="../case-study.html?p=' + esc(p.slug) + '" target="_blank" rel="noopener">view</a>' : "") + "</small></label>" +
      '<label>The challenge<textarea name="challenge" rows="3" placeholder="What was the situation when you were brought in?">' + esc(p.challenge || "") + "</textarea></label>" +
      '<label>What we did<textarea name="approach" rows="4" placeholder="How you ran the project">' + esc(p.approach || "") + "</textarea></label>" +
      '<div class="results-rows">' + r.map(function (x, i) {
        return '<div class="row"><label>Result ' + (i + 1) + '<input name="res_value_' + i + '" value="' + esc(x.value) + '" placeholder="₹6.2 Cr"></label>' +
          '<label>What it means<input name="res_label_' + i + '" value="' + esc(x.label) + '" placeholder="saved through competitive tendering"></label></div>';
      }).join("") + "</div>" +
      '<label>Client quote (optional)<textarea name="cs_quote" rows="2">' + esc(p.quote || "") + "</textarea></label>" +
      '<label>Quote by<input name="cs_quote_by" value="' + esc(p.quote_by || "") + '" placeholder="Director, Projects, residential developer"></label>' +
      "</fieldset>";
  }
  function readCaseStudy(form, name) {
    var slug = slugify(form.slug.value.trim() || name);
    if (slug.length < 3) { toast("Give the case-study page an address of at least 3 characters.", true); form.slug.focus(); return null; }
    var on = form.case_study.checked;
    if (on && (!form.challenge.value.trim() || !form.approach.value.trim())) {
      toast("Fill in the challenge and what you did, or untick the case-study box.", true);
      form.challenge.focus();
      return null;
    }
    return {
      slug: slug, case_study: on,
      challenge: form.challenge.value.trim(), approach: form.approach.value.trim(),
      results: [0, 1, 2].map(function (i) {
        return { value: form["res_value_" + i].value.trim(), label: form["res_label_" + i].value.trim() };
      }).filter(function (x) { return x.value; }),
      quote: form.cs_quote.value.trim(), quote_by: form.cs_quote_by.value.trim(),
    };
  }

  function renderProjectEditor() {
    var box = $("#project-editor");
    var isNew = state.projectId === "new";
    var p = isNew
      ? { name: "", sector: SECTORS[0], city: "", client: "", area: "", value: "", scope: "", status: "Completed", progress: 100, photo_url: "", featured: "no", sort_order: (state.projects.length + 1) * 10, published: true }
      : state.projects.filter(function (x) { return x.id === state.projectId; })[0];
    if (!p) { box.innerHTML = '<p class="empty">Select a project to edit it, or add a new one.</p>'; return; }
    function opt(list, current) {
      return list.map(function (o) {
        var id = typeof o === "string" ? o : o.id, label = typeof o === "string" ? o : o.label;
        return '<option value="' + esc(id) + '"' + (id === current ? " selected" : "") + ">" + esc(label) + "</option>";
      }).join("");
    }
    box.innerHTML =
      "<h2>" + (isNew ? "New project" : esc(p.name)) + "</h2>" +
      '<form id="project-form" class="form-stack" novalidate>' +
        '<label>Project name<input name="name" required value="' + esc(p.name) + '"></label>' +
        '<div class="grid2">' +
          '<label>Sector<select name="sector">' + opt(SECTORS, p.sector) + "</select></label>" +
          '<label>City<input name="city" value="' + esc(p.city) + '"></label>' +
          '<label>Client type<input name="client" value="' + esc(p.client) + '" placeholder="e.g. Residential developer"></label>' +
          '<label>Area<input name="area" value="' + esc(p.area) + '" placeholder="e.g. 6.5 lakh sq ft"></label>' +
          '<label>Project cost<input name="value" value="' + esc(p.value) + '" placeholder="e.g. ₹310 Cr"></label>' +
          '<label>Status<select name="status">' + opt(["Completed", "Ongoing"], p.status) + "</select></label>" +
          '<label>Percent complete<input name="progress" type="number" min="0" max="100" value="' + esc(p.progress) + '"><small>Shown only for ongoing projects.</small></label>' +
          '<label>Order on the site<input name="sort_order" type="number" value="' + esc(p.sort_order) + '"><small>Lower numbers come first.</small></label>' +
        "</div>" +
        '<label>Short description<textarea name="scope" rows="3">' + esc(p.scope) + "</textarea></label>" +
        '<label>Where it appears<select name="featured">' + opt(FEATURED, p.featured) + "</select></label>" +
        '<label class="check"><input type="checkbox" name="published"' + (p.published ? " checked" : "") + "> Show on the website</label>" +
        '<div class="photo-field"><label>Photo</label>' +
          (p.photo_url ? '<img id="photo-preview" src="' + esc(img(p.photo_url)) + '" alt="">' : '<img id="photo-preview" alt="" hidden>') +
          '<input type="file" id="photo-file" accept="image/jpeg,image/png,image/webp">' +
          "<small>JPG, PNG or WebP, up to 5 MB. Landscape photos at least 1600 px wide look best.</small>" +
          '<input type="hidden" name="photo_url" value="' + esc(p.photo_url) + '"></div>' +
        caseStudyFields(p) +
        '<div class="actions"><button class="btn" type="submit">' + (isNew ? "Add project" : "Save changes") + "</button>" +
        '<button class="btn btn-line" type="button" id="cancel-project">Cancel</button><span class="spacer"></span>' +
        (isNew ? "" : '<button class="btn btn-danger" type="button" id="delete-project">Delete</button>') + "</div>" +
      "</form>";

    var form = $("#project-form");
    $("#photo-file").addEventListener("change", function (ev) {
      var file = ev.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast("That photo is over 5 MB. Compress it and try again.", true); ev.target.value = ""; return; }
      var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      var path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      toast("Uploading photo…");
      sb.storage.from("project-photos").upload(path, file, { contentType: file.type }).then(function (res) {
        if (res.error) { toast("Upload failed: " + res.error.message, true); return; }
        var url = sb.storage.from("project-photos").getPublicUrl(path).data.publicUrl;
        form.photo_url.value = url;
        var prev = $("#photo-preview");
        prev.src = url;
        prev.hidden = false;
        toast("Photo uploaded. Save the project to keep it.");
      });
    });
    $("#cancel-project").addEventListener("click", function () { state.projectId = null; renderProjectList(); renderProjectEditor(); });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.name.value.trim()) { toast("Give the project a name.", true); form.name.focus(); return; }
      var row = {
        name: form.name.value.trim(), sector: form.sector.value, city: form.city.value.trim(),
        client: form.client.value.trim(), area: form.area.value.trim(), value: form.value.value.trim(),
        scope: form.scope.value.trim(), status: form.status.value,
        progress: Math.max(0, Math.min(100, parseInt(form.progress.value, 10) || 0)),
        sort_order: parseInt(form.sort_order.value, 10) || 100,
        featured: form.featured.value, published: form.published.checked, photo_url: form.photo_url.value,
      };
      if (row.status === "Completed") row.progress = 100;
      var cs = readCaseStudy(form, row.name);
      if (!cs) return;
      Object.assign(row, cs);
      var q = isNew ? sb.from("projects").insert(row).select() : sb.from("projects").update(row).eq("id", p.id).select();
      q.then(function (res) {
        if (res.error || !res.data.length) { toast("Couldn't save: " + (res.error ? res.error.message : "no access"), true); return; }
        var saved = res.data[0];
        // Only one project can be the large home-page lead.
        var demote = row.featured === "lead"
          ? sb.from("projects").update({ featured: "yes" }).eq("featured", "lead").neq("id", saved.id)
          : Promise.resolve();
        Promise.resolve(demote).then(function () {
          state.projectId = saved.id;
          loadProjects();
          toast(isNew ? "Project added" : "Project saved");
          setTimeout(renderProjectEditor, 400);
        });
      });
    });

    if (!isNew) armDelete($("#delete-project"), function () {
      sb.from("projects").delete().eq("id", p.id).then(function (res) {
        if (res.error) { toast("Couldn't delete.", true); return; }
        state.projectId = null;
        loadProjects();
        renderProjectEditor();
        toast("Project deleted");
      });
    });
  }

  /* ---- CMS: site settings ------------------------------------------ */
  var settings = {};
  function loadSettings() {
    sb.from("site_settings").select("key,value").then(function (res) {
      if (res.error) { toast("Couldn't load site content.", true); return; }
      res.data.forEach(function (r) { settings[r.key] = r.value; });
      var f = $("#settings-form");
      var c = settings.contact || {};
      ["phone", "whatsapp", "email", "linkedin", "address", "regions", "hours"].forEach(function (k) { f[k].value = c[k] || ""; });
      var t = settings.testimonial || {};
      f.quote.value = t.quote || "";
      f.t_name.value = t.name || "";
      f.t_org.value = t.org || "";
      f.showSampleNotice.checked = !!(settings.notice && settings.notice.showSampleNotice);
      var stats = settings.stats || [];
      while (stats.length < 4) stats.push({ value: "", label: "" });
      $("#stats-rows").innerHTML = stats.slice(0, 4).map(function (s, i) {
        return '<div class="row"><label>Figure ' + (i + 1) + '<input name="stat_value_' + i + '" value="' + esc(s.value) + '" placeholder="120+"></label>' +
          '<label>Description<input name="stat_label_' + i + '" value="' + esc(s.label) + '" placeholder="projects managed since 2012"></label></div>';
      }).join("");
      var jobs = Array.isArray(settings.jobs) ? settings.jobs.slice(0, 6) : [];
      while (jobs.length < 6) jobs.push({ title: "", location: "", experience: "", type: "Full time", summary: "" });
      $("#job-rows").innerHTML = jobs.map(function (j, i) {
        return '<div class="job-row"><div class="grid2">' +
          '<label>Role ' + (i + 1) + '<input name="job_title_' + i + '" value="' + esc(j.title) + '" placeholder="Site Engineer, civil"></label>' +
          '<label>Location<input name="job_location_' + i + '" value="' + esc(j.location) + '" placeholder="Pune"></label>' +
          '<label>Experience<input name="job_exp_' + i + '" value="' + esc(j.experience) + '" placeholder="3 to 6 years"></label>' +
          '<label>Type<input name="job_type_' + i + '" value="' + esc(j.type) + '" placeholder="Full time"></label>' +
          '<label class="full">One-line description<input name="job_summary_' + i + '" value="' + esc(j.summary) + '"></label>' +
          "</div></div>";
      }).join("");
    });
  }
  $("#settings-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    var btn = $("button[type=submit]", f);
    var stats = [0, 1, 2, 3].map(function (i) {
      return { value: f["stat_value_" + i].value.trim(), label: f["stat_label_" + i].value.trim() };
    }).filter(function (s) { return s.value; });
    var rows = [
      { key: "contact", value: {
        phone: f.phone.value.trim(), whatsapp: digits(f.whatsapp.value), email: f.email.value.trim(),
        linkedin: f.linkedin.value.trim(), address: f.address.value.trim(), regions: f.regions.value.trim(), hours: f.hours.value.trim(),
      } },
      { key: "stats", value: stats },
      { key: "testimonial", value: { quote: f.quote.value.trim(), name: f.t_name.value.trim(), org: f.t_org.value.trim() } },
      { key: "notice", value: { showSampleNotice: f.showSampleNotice.checked } },
      { key: "jobs", value: [0, 1, 2, 3, 4, 5].map(function (i) {
        return {
          title: f["job_title_" + i].value.trim(), location: f["job_location_" + i].value.trim(),
          experience: f["job_exp_" + i].value.trim(), type: f["job_type_" + i].value.trim(),
          summary: f["job_summary_" + i].value.trim(),
        };
      }).filter(function (j) { return j.title; }) },
    ];
    btn.disabled = true;
    sb.from("site_settings").upsert(rows).select().then(function (res) {
      btn.disabled = false;
      if (res.error) { toast("Couldn't save: " + res.error.message, true); return; }
      $("#settings-status").textContent = "Saved. The website shows the changes straight away.";
      toast("Site content saved");
    });
  });

  /* ---- CMS: insights (articles) ------------------------------------ */
  var posts = [], postId = null;
  function loadPosts() {
    sb.from("posts").select("*").order("published_at", { ascending: false }).then(function (res) {
      if (res.error) { toast("Couldn't load articles.", true); return; }
      posts = res.data;
      renderPostList();
    });
  }
  function renderPostList() {
    $("#post-list").innerHTML = posts.map(function (p) {
      return '<button type="button" class="card' + (p.id === postId ? " selected" : "") + '" data-id="' + p.id + '">' +
        (p.cover_url ? '<img src="' + esc(img(p.cover_url)) + '" alt="">' : '<span class="noimg"></span>') +
        "<span><b>" + esc(p.title) + '</b><span class="sub">' + esc(p.published_at) + "</span></span>" +
        '<span class="tags"><span>' + (p.published ? "Published" : "Draft") + "</span></span></button>";
    }).join("") || '<p class="empty">No articles yet.</p>';
  }
  $("#post-list").addEventListener("click", function (e) {
    var c = e.target.closest(".card");
    if (!c) return;
    postId = c.getAttribute("data-id");
    renderPostList();
    renderPostEditor();
  });
  $("#add-post").addEventListener("click", function () { postId = "new"; renderPostList(); renderPostEditor(); });

  function renderPostEditor() {
    var box = $("#post-editor");
    var isNew = postId === "new";
    var p = isNew
      ? { title: "", slug: "", excerpt: "", body: "", cover_url: "", author: "AVSPMC", published: false, published_at: new Date().toISOString().slice(0, 10) }
      : posts.filter(function (x) { return x.id === postId; })[0];
    if (!p) { box.innerHTML = '<p class="empty">Select an article to edit it, or write a new one.</p>'; return; }
    box.innerHTML =
      "<h2>" + (isNew ? "New article" : esc(p.title)) + "</h2>" +
      '<form id="post-form" class="form-stack" novalidate>' +
        '<label>Title<input name="title" required value="' + esc(p.title) + '"></label>' +
        '<label>Page address<input name="slug" value="' + esc(p.slug) + '" placeholder="made from the title if left empty"><small>' +
          (p.slug && !isNew ? 'Page: <a href="../article.html?p=' + esc(p.slug) + '" target="_blank" rel="noopener">view</a>' : "Lowercase words joined by hyphens.") + "</small></label>" +
        '<label>Summary<textarea name="excerpt" rows="2" maxlength="400" placeholder="One or two sentences shown on the Insights page">' + esc(p.excerpt) + "</textarea></label>" +
        '<label>Article<textarea name="body" rows="16" class="mono">' + esc(p.body) + "</textarea>" +
          "<small>Leave a blank line between paragraphs. ## starts a heading, - starts a bullet, 1. a numbered point, **bold**, [link text](https://…).</small></label>" +
        '<div class="grid2">' +
          '<label>Date<input name="published_at" type="date" value="' + esc(p.published_at) + '"></label>' +
          '<label>Author<input name="author" value="' + esc(p.author) + '"></label>' +
        "</div>" +
        '<div class="photo-field"><label>Cover photo</label>' +
          (p.cover_url ? '<img id="cover-preview" src="' + esc(img(p.cover_url)) + '" alt="">' : '<img id="cover-preview" alt="" hidden>') +
          '<input type="file" id="cover-file" accept="image/jpeg,image/png,image/webp"><small>Landscape, up to 5 MB.</small>' +
          '<input type="hidden" name="cover_url" value="' + esc(p.cover_url) + '"></div>' +
        '<label class="check"><input type="checkbox" name="published"' + (p.published ? " checked" : "") + "> Published on the website</label>" +
        '<div class="actions"><button class="btn" type="submit">' + (isNew ? "Save article" : "Save changes") + "</button>" +
        '<button class="btn btn-line" type="button" id="cancel-post">Cancel</button><span class="spacer"></span>' +
        (isNew ? "" : '<button class="btn btn-danger" type="button" id="delete-post">Delete</button>') + "</div>" +
      "</form>";
    var form = $("#post-form");
    $("#cover-file").addEventListener("change", function (ev) {
      var file = ev.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast("That photo is over 5 MB.", true); ev.target.value = ""; return; }
      var path = "articles/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ((file.name.split(".").pop() || "jpg").toLowerCase());
      toast("Uploading photo…");
      sb.storage.from("project-photos").upload(path, file, { contentType: file.type }).then(function (res) {
        if (res.error) { toast("Upload failed: " + res.error.message, true); return; }
        var url = sb.storage.from("project-photos").getPublicUrl(path).data.publicUrl;
        form.cover_url.value = url;
        var prev = $("#cover-preview");
        prev.src = url; prev.hidden = false;
        toast("Photo uploaded. Save the article to keep it.");
      });
    });
    $("#cancel-post").addEventListener("click", function () { postId = null; renderPostList(); renderPostEditor(); });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var title = form.title.value.trim();
      if (title.length < 3) { toast("Give the article a title.", true); form.title.focus(); return; }
      var row = {
        title: title, slug: slugify(form.slug.value.trim() || title), excerpt: form.excerpt.value.trim(),
        body: form.body.value, cover_url: form.cover_url.value, author: form.author.value.trim() || "AVSPMC",
        published: form.published.checked, published_at: form.published_at.value || new Date().toISOString().slice(0, 10),
      };
      if (row.slug.length < 3) { toast("The page address needs at least 3 characters.", true); return; }
      var q = isNew ? sb.from("posts").insert(row).select() : sb.from("posts").update(row).eq("id", p.id).select();
      q.then(function (res) {
        if (res.error || !res.data.length) {
          var msg = res.error && /duplicate/i.test(res.error.message) ? "Another article already uses that page address." : (res.error ? res.error.message : "no access");
          toast("Couldn't save: " + msg, true);
          return;
        }
        postId = res.data[0].id;
        loadPosts();
        toast(row.published ? "Article saved and published" : "Draft saved");
        setTimeout(renderPostEditor, 400);
      });
    });
    if (!isNew) armDelete($("#delete-post"), function () {
      sb.from("posts").delete().eq("id", p.id).then(function (res) {
        if (res.error) { toast("Couldn't delete.", true); return; }
        postId = null;
        loadPosts();
        renderPostEditor();
        toast("Article deleted");
      });
    });
  }
})();

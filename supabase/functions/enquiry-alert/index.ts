// AVSPMC: emails an alert for each new website enquiry.
//
// Called by a database trigger with { id } after an enquiry is inserted.
// It does its own checks instead of trusting the caller: it loads the
// enquiry itself, only alerts for enquiries created in the last 15
// minutes, and only once per enquiry (alerted_at). So calling this URL
// directly can't send fake or repeated alerts.
//
// Email is sent through Resend (https://resend.com). Set these secrets in
// Supabase > Edge Functions > Secrets:
//   RESEND_API_KEY   your Resend API key
//   ALERT_EMAIL_TO   where alerts go (comma-separate for several)
//   ALERT_EMAIL_FROM optional, e.g. "AVSPMC Website <alerts@yourdomain>"
//                    (needs a domain verified in Resend; otherwise the
//                    default onboarding@resend.dev sender is used)
//
// Optional thank-you email to the person who filled in the form (only when
// they gave an email address). Off until you set:
//   AUTO_REPLY_FROM     e.g. "AVSPMC <hello@avsllp.co>" (domain verified in Resend)
//   AUTO_REPLY_REPLY_TO optional, where their replies should go
// To stop the form being used to email strangers, each address gets at most
// one thank-you email a day.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ADMIN_URL = "https://avspmc.avsllp.co/admin/";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true });

  let id: unknown;
  try {
    ({ id } = await req.json());
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "bad request" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: e } = await sb.from("enquiries").select("*").eq("id", id).maybeSingle();
  if (!e || e.alerted_at) return json({ skipped: "unknown or already alerted" });
  if (Date.now() - new Date(e.created_at).getTime() > 15 * 60 * 1000) return json({ skipped: "too old" });

  const key = Deno.env.get("RESEND_API_KEY");
  const to = (Deno.env.get("ALERT_EMAIL_TO") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!key || !to.length) return json({ sent: false, reason: "email alerts not configured" });

  // Claim the enquiry so two calls can't both send.
  const { data: claimed } = await sb.from("enquiries")
    .update({ alerted_at: new Date().toISOString() })
    .eq("id", id).is("alerted_at", null).select("id");
  if (!claimed?.length) return json({ skipped: "already alerted" });

  const rows: [string, string][] = [
    ["Name", e.name],
    ["Phone", e.phone],
    ["Email", e.email || "Not given"],
    ["Project type", e.sector || "Not specified"],
    ["City", e.city || "Not specified"],
    ["Built-up area", e.area || "Not specified"],
    ["Stage", e.stage || "Not specified"],
  ];
  let wa = String(e.phone || "").replace(/\D/g, "");
  if (wa.length === 10) wa = "91" + wa;
  const source = String(e.source || "contact");
  const isDownload = source.startsWith("resource:");
  const intro = isDownload ? "Someone downloaded a free resource from the AVSPMC website."
    : source === "estimator" ? "Someone used the cost estimator and asked for a call back."
    : source === "career" ? "New job application from the AVSPMC website."
    : "New enquiry from the AVSPMC website.";
  const subject = isDownload ? `Download lead: ${e.name}, ${String(e.message || "").replace(/^Downloaded: /, "")}`
    : source === "estimator" ? `Estimator lead: ${e.name}, ${e.sector || "project"}${e.area ? ", " + e.area : ""}`
    : source === "career" ? `Job application: ${e.name}, ${e.sector || "role not given"}`
    : `New enquiry: ${e.name}${e.sector ? ", " + e.sector : ""}${e.city ? ", " + e.city : ""}`;

  const html = `
  <div style="font-family:Arial,sans-serif;font-size:15px;color:#1A1F27;max-width:560px">
    <p style="margin:0 0 16px">${intro}</p>
    <table style="border-collapse:collapse;width:100%">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#5D6573;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join("")}
    </table>
    <p style="white-space:pre-wrap;background:#F2F3F5;padding:12px 14px;border-radius:4px;margin:16px 0">${esc(e.message)}</p>
    <p style="margin:0 0 6px">
      <a href="tel:${esc(e.phone)}">Call</a> &nbsp;·&nbsp;
      <a href="https://wa.me/${esc(wa)}">WhatsApp</a>
      ${e.email ? `&nbsp;·&nbsp; <a href="mailto:${esc(e.email)}">Reply by email</a>` : ""}
    </p>
    <p style="margin:16px 0 0"><a href="${ADMIN_URL}" style="color:#16325C">Open the enquiry in the admin page</a></p>
  </div>`;

  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\n${e.message}\n\nAdmin: ${ADMIN_URL}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("ALERT_EMAIL_FROM") || "AVSPMC Website <onboarding@resend.dev>",
      to,
      subject,
      html,
      text,
      ...(e.email ? { reply_to: e.email } : {}),
    }),
  });

  if (!res.ok) {
    // Release the claim so a later retry can send it.
    await sb.from("enquiries").update({ alerted_at: null }).eq("id", id);
    const detail = await res.text();
    console.error("Resend error", res.status, detail);
    return json({ sent: false, status: res.status }, 502);
  }
  let autoReply = "off";
  try {
    autoReply = await sendAutoReply(sb, key, e, source);
  } catch (err) {
    console.error("Auto-reply failed", err);
    autoReply = "failed";
  }
  return json({ sent: true, autoReply });
});

// deno-lint-ignore no-explicit-any
async function sendAutoReply(sb: any, key: string, e: any, source: string) {
  const from = Deno.env.get("AUTO_REPLY_FROM");
  const email = String(e.email || "").trim();
  if (!from || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "off";

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb.from("enquiries").select("id", { count: "exact", head: true })
    .ilike("email", email).gte("created_at", since);
  if ((count ?? 0) > 1) return "skipped: already sent today";

  const first = String(e.name || "").trim().split(/\s+/)[0] || "there";
  const what = String(e.message || "").replace(/^Downloaded: /, "");
  // Each message is a list of paragraphs.
  const [subject, body]: [string, string[]] = source.startsWith("resource:")
    ? ["Your AVSPMC download", [
        `Thanks for downloading ${what || "our guide"}. We hope it helps.`,
        "If you'd like a second opinion on your project, budget or contractor bids, just reply to this email or call us. There's no charge for a first conversation.",
      ]]
    : source === "career"
    ? ["We've received your application", [
        "Thanks for applying to AVSPMC. We read every application and will contact you if your experience matches an open role.",
      ]]
    : ["We've received your enquiry", [
        "Thanks for getting in touch with AVSPMC. One of our project managers will call you within one working day to understand your project.",
        "If it helps, have your drawings, budget or contractor quotes to hand. Nothing is needed to get started.",
      ]];

  const paras = [`Dear ${first},`, ...body, "Regards,\nAVSPMC Project Management Consultants\nhttps://avspmc.avsllp.co"];
  const text = paras.join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1A1F27;max-width:560px">` +
    paras.map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("") + `</div>`;
  const replyTo = Deno.env.get("AUTO_REPLY_REPLY_TO");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) {
    console.error("Resend auto-reply error", res.status, await res.text());
    return "failed";
  }
  return "sent";
}

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
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ADMIN_URL = "https://avspms.avsllp.co/admin/";

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

  const html = `
  <div style="font-family:Arial,sans-serif;font-size:15px;color:#1A1F27;max-width:560px">
    <p style="margin:0 0 16px">New enquiry from the AVSPMC website.</p>
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
      subject: `New enquiry: ${e.name}${e.sector ? ", " + e.sector : ""}${e.city ? ", " + e.city : ""}`,
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
  return json({ sent: true });
});

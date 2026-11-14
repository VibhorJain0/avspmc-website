# Supabase (project "avspmc")

This database is shared by two websites. Every row in `public.enquiries` has a `site` column:

| `site` | Website |
|---|---|
| `pmc` (default) | avspmc.avsllp.co |
| `solar` | solar.avsllp.co, the ATIVEER solar EPC site |

The admin page (`/admin/`) has a website filter (All / AVSPMC / Solar) above the status filter, and
remembers the last choice in that browser. Schema changes are recorded in `migrations/`.

`functions/enquiry-alert/index.ts` is the Edge Function that emails an alert for each new enquiry.
A database trigger (`private.notify_new_enquiry`) calls it after every insert into `public.enquiries`.
Solar enquiries get their own subject ("Solar enquiry: …") and labels.

The live function (version 5, deployed 2026-11-14) is this file **without** the optional thank-you
auto-reply (`sendAutoReply`), which has not been deployed yet. Deploying this file as it is turns that on
for AVSPMC enquiries whenever `AUTO_REPLY_FROM` is set. It is never sent to solar enquiries.

To turn email alerts on, add these in Supabase > Edge Functions > Secrets:

| Secret | Value |
|---|---|
| `RESEND_API_KEY` | API key from resend.com |
| `ALERT_EMAIL_TO` | where alerts go, e.g. you@example.com (comma-separate several) |
| `ALERT_EMAIL_TO_SOLAR` | optional; where solar.avsllp.co alerts go instead of `ALERT_EMAIL_TO` |
| `ALERT_EMAIL_FROM` | optional; needs a domain verified in Resend |

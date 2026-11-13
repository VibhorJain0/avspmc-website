# Supabase (project "avspmc")

`functions/enquiry-alert/index.ts` is a copy of the deployed Edge Function that emails an alert for
each new enquiry. A database trigger (`private.notify_new_enquiry`) calls it after every insert into
`public.enquiries`.

To turn email alerts on, add these in Supabase > Edge Functions > Secrets:

| Secret | Value |
|---|---|
| `RESEND_API_KEY` | API key from resend.com |
| `ALERT_EMAIL_TO` | where alerts go, e.g. you@example.com (comma-separate several) |
| `ALERT_EMAIL_FROM` | optional; needs a domain verified in Resend |

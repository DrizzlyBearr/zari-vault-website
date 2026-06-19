# Inquiry handling (Resend + Supabase)

All site forms (contact, waitlist, exit popup) submit to the Vercel serverless
function [`api/submit.js`](api/submit.js). That function:

1. Stores the submission in Supabase (project `zari-vault`, table `public.submissions`).
2. Sends a notification email via Resend to your inbox.

**Security:** the browser only ever calls our own `/api/submit`. No API keys or
database credentials are exposed client-side. The `submissions` table has Row
Level Security enabled with **no policies**, so the public key cannot touch it;
only the server-side `service_role` key (in Vercel env vars) can write to it.

## Required Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production +
Preview). None of these belong in the repo.

| Variable | Where to get it | Example |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL | `https://azaxixarojnjgjgxhsyp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (secret) | `eyJ...` (keep secret) |
| `RESEND_API_KEY` | Resend → API Keys | `re_...` |
| `INQUIRY_TO_EMAIL` | Inbox that receives notifications | `hello@zarivault.co.za` |
| `INQUIRY_FROM_EMAIL` | Verified Resend sender on your domain | `Zari Vault <noreply@zarivault.co.za>` |

After adding/changing env vars, redeploy for them to take effect.

## Resend setup (one-time)

1. Create an account at https://resend.com.
2. **Add your domain** (`zarivault.co.za`) under Domains and add the DNS records
   Resend shows (SPF/DKIM, and a DMARC record) at your DNS provider. Wait for
   verification to go green. Sending from an unverified domain will fail, so the
   `INQUIRY_FROM_EMAIL` address must be on a verified domain.
3. Create an **API key** and put it in `RESEND_API_KEY`.
4. `INQUIRY_TO_EMAIL` (`hello@zarivault.co.za`) must be a real mailbox you can
   read. `INQUIRY_FROM_EMAIL` should be an address on the verified domain
   (a real mailbox is not required for the "from", but it must be your domain).

Until Resend is configured, submissions are still **saved to Supabase** (nothing
is lost); only the email notification is skipped.

## Viewing submissions

Supabase → `zari-vault` project → Table Editor → `submissions`, or SQL:

```sql
select created_at, type, email, first_name, subject, message
from public.submissions
order by created_at desc;
```

## Database schema

See [`supabase/migrations/0001_create_submissions.sql`](supabase/migrations/0001_create_submissions.sql).

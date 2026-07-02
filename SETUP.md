# Inquiry handling (Resend + Supabase, encrypted at rest)

All site forms (contact, waitlist, exit popup) submit to the Vercel serverless
function [`api/submit.js`](api/submit.js). That function:

1. **Encrypts** the personal data (AES-256-GCM) in memory.
2. Stores only the **ciphertext** in Supabase (project `zari-vault`, table `public.submissions`).
3. Sends a plaintext notification email via Resend to your inbox.

## Security model

- The browser only ever calls our own `/api/submit`. No keys or database access
  exist client-side.
- The `submissions` table has Row Level Security enabled with **no policies**, so
  the public key cannot touch it; only the server-side `service_role` key can.
- **Encryption at rest above Supabase:** personal data is encrypted before it is
  written, with a key (`SUBMISSIONS_ENC_KEY`) that lives **only in Vercel env
  vars, never in the database**. Anyone who bypasses Supabase (leaked
  service-role key, DB dump, insider) sees only ciphertext.
- The database stores per row: `type`, `created_at`, `email_hash` (a keyed HMAC
  for dedupe/lookup without revealing the address), and the encrypted `payload`.
  No plaintext name, email, subject or message is ever stored.
- The function **fails closed**: if the encryption key is missing it refuses to
  store rather than fall back to plaintext.

## Required Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production +
Preview). None of these belong in the repo. Only the three secrets are required;
the public values (Supabase URL, to/from addresses) have safe defaults baked into
`api/submit.js` and only need env vars if you want to override them.

| Variable | Required | Where to get it |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase → Project Settings → API → `service_role` (secret) |
| `SUBMISSIONS_ENC_KEY` | Yes | Generate yourself (see below) |
| `RESEND_API_KEY` | Yes | Resend → API Keys |
| `SUPABASE_URL` | No (defaults to the zari-vault project URL) | Supabase → Project Settings → API |
| `INQUIRY_TO_EMAIL` | No (defaults to `hello@zarivault.co.za`) | Inbox that receives notifications |
| `INQUIRY_FROM_EMAIL` | No (defaults to `Zari Vault <noreply@zarivault.co.za>`) | Verified Resend sender on your domain |

After adding/changing env vars, redeploy for them to take effect.

### Generating `SUBMISSIONS_ENC_KEY`

Run this **yourself** and paste the output straight into Vercel. Generating it
locally means the key is never shared with anyone (not even in chat):

```sh
openssl rand -base64 32
```

> ⚠️ **Back this key up somewhere safe (e.g. a password manager).** It is the
> only thing that can decrypt stored submissions. If you lose it, existing
> encrypted records are unrecoverable. If you rotate it, old records can only be
> read with the old key.

## Resend setup (one-time)

1. Create an account at https://resend.com.
2. **Add your domain** (`zarivault.co.za`) under Domains and add the DNS records
   Resend shows (SPF/DKIM/DMARC) at your DNS provider. Wait for verification to go
   green. `INQUIRY_FROM_EMAIL` must be on a verified domain.
3. Create an **API key** → `RESEND_API_KEY`. Keep it secret; never commit it.
4. `INQUIRY_TO_EMAIL` (`hello@zarivault.co.za`) must be a real mailbox you can read.

Until Resend is configured, submissions are still **encrypted and saved to
Supabase** (nothing is lost); only the email notification is skipped.

## Reading submissions

Two ways:

1. **Email** — the plaintext notification lands in `INQUIRY_TO_EMAIL`.
2. **Decrypt locally** — the database is ciphertext, so use the helper script.
   The key stays on your machine:

   ```sh
   SUPABASE_URL=https://azaxixarojnjgjgxhsyp.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=... \
   SUBMISSIONS_ENC_KEY=... \
   node scripts/decrypt-submissions.js          # all, or: node scripts/decrypt-submissions.js contact
   ```

Browsing the Supabase Table Editor directly will only show encrypted blobs, by design.

## Database schema

See [`supabase/migrations/`](supabase/migrations/):
- `0001_create_submissions.sql` — initial table + RLS.
- `0002_encrypt_submissions.sql` — switch to encrypted-at-rest storage.

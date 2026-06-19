-- Move submissions to application-layer encryption at rest.
-- Personal data is now encrypted (AES-256-GCM) by the Vercel function before it
-- is stored, so the database holds no plaintext PII. The encryption key lives
-- only in Vercel env vars, never here, so a DB dump / leaked service-role key /
-- insider cannot read customer information.

-- Drop plaintext PII columns (and their length constraints, which fall with them).
alter table public.submissions
  drop column if exists first_name,
  drop column if exists last_name,
  drop column if exists email,
  drop column if exists subject,
  drop column if exists message,
  drop column if exists source,
  drop column if exists user_agent;

-- email_hash: HMAC-SHA256 of the normalised email (keyed with a secret derived
--   from the master key) so submissions can be deduped/looked up without ever
--   exposing the address.
-- payload: base64( iv(12) || gcm_tag(16) || ciphertext ) of the personal JSON.
alter table public.submissions
  add column if not exists email_hash text,
  add column if not exists payload    text;

create index if not exists submissions_email_hash_idx on public.submissions (email_hash);

comment on column public.submissions.email_hash is
  'HMAC-SHA256 of the lowercased email. Keyed; not reversible without the server key.';
comment on column public.submissions.payload is
  'AES-256-GCM encrypted personal data: base64(iv||tag||ciphertext). Key never stored in DB.';

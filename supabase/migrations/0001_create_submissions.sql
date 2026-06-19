-- Customer-facing submissions (contact form, waitlist, exit popup, download CTA).
--
-- Security model: RLS is ENABLED and there are intentionally NO policies, so the
-- anon/public and authenticated roles cannot read or write this table at all.
-- Only the service_role key (used exclusively in the Vercel serverless function
-- api/submit.js, never in the browser) bypasses RLS. This keeps customer PII private.
--
-- Applied to the dedicated "zari-vault" Supabase project (ref: azaxixarojnjgjgxhsyp).

create table public.submissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('contact','waitlist','exit','download')),
  first_name  text,
  last_name   text,
  email       text not null,
  subject     text,
  message     text,
  source      text,
  user_agent  text,
  constraint email_len   check (char_length(email) <= 320),
  constraint message_len check (message is null or char_length(message) <= 5000),
  constraint name_len    check (
    (first_name is null or char_length(first_name) <= 100) and
    (last_name  is null or char_length(last_name)  <= 100)
  )
);

alter table public.submissions enable row level security;

create index submissions_created_at_idx on public.submissions (created_at desc);
create index submissions_type_idx       on public.submissions (type);

comment on table public.submissions is
  'Customer submissions from zarivault.co.za. RLS on with no policies: only the server-side service_role can access. Written by the Vercel /api/submit function.';

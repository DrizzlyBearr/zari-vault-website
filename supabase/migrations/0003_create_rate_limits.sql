-- Rate limiting for /api/submit. RLS enabled with no policies (server-only).
-- IPs are stored only as a keyed HMAC hash, never in plaintext.
create table if not exists public.rate_limits (
  id         uuid primary key default gen_random_uuid(),
  ip_hash    text not null,
  action     text not null,
  created_at timestamptz not null default now()
);

alter table public.rate_limits enable row level security;

create index if not exists rate_limits_lookup_idx on public.rate_limits (ip_hash, created_at desc);

comment on table public.rate_limits is
  'Per-IP submission rate limiting. ip_hash is an HMAC, not a raw address. RLS on, no policies: server-only.';

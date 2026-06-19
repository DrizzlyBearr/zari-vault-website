#!/usr/bin/env node
//
// Read and decrypt submissions locally.
//
// Submissions are stored encrypted in Supabase; this is the tool to read them.
// The decryption key never leaves your machine. Requires Node 18+ and these
// environment variables (do NOT hardcode them):
//
//   SUPABASE_URL=https://azaxixarojnjgjgxhsyp.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   SUBMISSIONS_ENC_KEY=...  (the same base64 key set in Vercel) \
//   node scripts/decrypt-submissions.js
//
// Optional: pass a type to filter, e.g. `node scripts/decrypt-submissions.js contact`

const crypto = require('crypto');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUBMISSIONS_ENC_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUBMISSIONS_ENC_KEY) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUBMISSIONS_ENC_KEY in the environment.');
  process.exit(1);
}

const master = Buffer.from(SUBMISSIONS_ENC_KEY, 'base64');
const encKey = Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), Buffer.from('zari-submissions-enc'), 32));

function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', encKey, iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(ct), d.final()]).toString('utf8'));
}

(async () => {
  const typeFilter = process.argv[2];
  let url = `${SUPABASE_URL}/rest/v1/submissions?select=created_at,type,payload&order=created_at.desc`;
  if (typeFilter) url += `&type=eq.${encodeURIComponent(typeFilter)}`;

  const r = await fetch(url, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!r.ok) {
    console.error('Fetch failed:', r.status, await r.text());
    process.exit(1);
  }
  const rows = await r.json();
  for (const row of rows) {
    let p;
    try { p = decrypt(row.payload); } catch (e) { p = { error: 'decrypt failed (wrong key?)' }; }
    console.log(JSON.stringify({ created_at: row.created_at, type: row.type, ...p }));
  }
  console.error(`\n${rows.length} submission(s).`);
})();

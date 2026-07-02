// Vercel Cron endpoint: keeps the Supabase database from auto-pausing on the
// free tier by doing a tiny read once a day. Scheduled in vercel.json ("crons").
//
// A paused database would make /api/submit fail to store submissions, so this
// keeps it warm during quiet, low-traffic periods (e.g. pre-launch).
//
// Optional hardening: if CRON_SECRET is set in Vercel, Vercel sends it as
// `Authorization: Bearer <CRON_SECRET>` on cron invocations, and we require it.

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://azaxixarojnjgjgxhsyp.supabase.co';
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_ROLE) {
    return res.status(500).json({ ok: false, error: 'not configured' });
  }

  try {
    // A minimal read against Postgres counts as activity and keeps the DB awake.
    const r = await fetch(`${SUPABASE_URL}/rest/v1/submissions?select=id&limit=1`, {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    return res.status(200).json({ ok: r.ok, ts: new Date().toISOString() });
  } catch (err) {
    console.error('keepalive ping failed:', err);
    return res.status(200).json({ ok: false, ts: new Date().toISOString() });
  }
};

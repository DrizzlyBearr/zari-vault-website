// Vercel serverless function: /api/submit
//
// Receives form submissions (contact / waitlist / exit / download) from the
// browser, stores them in Supabase, and emails a notification via Resend.
//
// SECURITY MODEL
// - This code runs server-side only. The browser never sees any secret.
// - Supabase access uses the SERVICE ROLE key, which bypasses RLS. The
//   `submissions` table has RLS enabled with no policies, so the public
//   anon key (and therefore the browser) cannot read or write it at all.
// - All secrets come from Vercel environment variables, never the repo.
//
// Required environment variables (set in Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL                e.g. https://azaxixarojnjgjgxhsyp.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   Supabase → Project Settings → API → service_role (secret)
//   RESEND_API_KEY              Resend → API Keys
//   INQUIRY_TO_EMAIL            where notifications are sent, e.g. hello@zarivault.co.za
//   INQUIRY_FROM_EMAIL          verified Resend sender, e.g. "Zari Vault <noreply@zarivault.co.za>"

const ALLOWED_TYPES = ['contact', 'waitlist', 'exit', 'download'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clip(value, max) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Body is auto-parsed by Vercel for application/json; fall back to manual parse.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  // Honeypot: silently accept (so bots think they succeeded) but do nothing.
  if (body.botcheck) return res.status(200).json({ success: true });

  const type = ALLOWED_TYPES.includes(body.type) ? body.type : null;
  const email = clip(body.email, 320);
  if (!type) return res.status(400).json({ success: false, error: 'Invalid submission type' });
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, error: 'A valid email is required' });
  }

  const record = {
    type,
    email,
    first_name: clip(body.firstName, 100),
    last_name: clip(body.lastName, 100),
    subject: clip(body.subject, 200),
    message: clip(body.message, 5000),
    source: clip(body.source, 100),
    user_agent: clip(req.headers['user-agent'], 500),
  };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO = process.env.INQUIRY_TO_EMAIL;
  const FROM = process.env.INQUIRY_FROM_EMAIL;

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing Supabase env vars');
    return res.status(500).json({ success: false, error: 'Server not configured' });
  }

  // 1) Store in Supabase (source of truth). If this fails, the request fails.
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(record),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error('Supabase insert failed:', r.status, detail);
      return res.status(502).json({ success: false, error: 'Could not save submission' });
    }
  } catch (err) {
    console.error('Supabase insert error:', err);
    return res.status(502).json({ success: false, error: 'Could not save submission' });
  }

  // 2) Email notification via Resend (best-effort: the record is already saved).
  if (RESEND_API_KEY && TO && FROM) {
    const name = [record.first_name, record.last_name].filter(Boolean).join(' ') || '(no name given)';
    const lines = [
      ['Type', type],
      ['Email', email],
      ['Name', name],
      ['Subject', record.subject],
      ['Source', record.source],
      ['Message', record.message],
    ].filter(([, v]) => v);
    const html =
      `<h2>New ${escapeHtml(type)} submission</h2>` +
      '<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">' +
      lines.map(([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top;"><strong>${escapeHtml(k)}</strong></td>` +
        `<td style="padding:4px 0;white-space:pre-wrap;">${escapeHtml(v)}</td></tr>`
      ).join('') +
      '</table>';
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM,
          to: [TO],
          reply_to: email,
          subject: `Zari Vault: new ${type}${record.subject ? ': ' + record.subject : ''}`,
          html,
        }),
      });
      if (!r.ok) console.error('Resend send failed:', r.status, await r.text());
    } catch (err) {
      console.error('Resend send error:', err);
    }
  }

  return res.status(200).json({ success: true });
};

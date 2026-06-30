// Vercel serverless function: /api/submit
//
// Receives form submissions (contact / waitlist / exit / download) from the
// browser, ENCRYPTS the personal data, stores the ciphertext in Supabase, and
// emails a plaintext notification via Resend.
//
// SECURITY MODEL
// - Runs server-side only. The browser never sees any secret.
// - Personal data is AES-256-GCM encrypted BEFORE it is written to Supabase. The
//   key lives only in Vercel env vars, never in the database. Anyone who bypasses
//   Supabase RLS (leaked service-role key, DB dump, insider) sees only ciphertext.
// - Hardening: origin allowlist, honeypot, disposable-email blocklist, and
//   per-IP rate limiting (IP stored only as a keyed hash).
// - Fail closed on encryption; fail open on rate-limit lookups (a limiter outage
//   must not take the form down).
//
// Required env vars (Vercel -> Project -> Settings -> Environment Variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUBMISSIONS_ENC_KEY,
//   RESEND_API_KEY, INQUIRY_TO_EMAIL, INQUIRY_FROM_EMAIL

const crypto = require('crypto');

const ALLOWED_TYPES = ['contact', 'waitlist', 'exit', 'download'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Per-IP cap across all submission types, per rolling hour.
const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// Hosts allowed to call this endpoint (production + Vercel previews + local dev).
function originAllowed(origin) {
  if (!origin) return true; // lenient if the header is absent
  try {
    const h = new URL(origin).hostname;
    return (
      h === 'zarivault.co.za' ||
      h === 'www.zarivault.co.za' ||
      h.endsWith('.vercel.app') ||
      h === 'localhost' ||
      h === '127.0.0.1'
    );
  } catch (_) {
    return false;
  }
}

// Common throwaway/temp email providers.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'trashmail.com', 'yopmail.com', 'sharklasers.com',
  'getnada.com', 'nada.email', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
  'fakeinbox.com', 'mailnesia.com', 'mvrht.com', 'emailondeck.com', 'moakt.com',
  'mintemail.com', 'spamgourmet.com', 'mohmal.com', 'tempr.email', 'discard.email',
]);

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

function deriveKeys(masterB64) {
  const master = Buffer.from(masterB64, 'base64');
  if (master.length < 32) throw new Error('SUBMISSIONS_ENC_KEY must be >= 32 bytes (base64)');
  const encKey = Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), Buffer.from('zari-submissions-enc'), 32));
  const macKey = Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), Buffer.from('zari-submissions-mac'), 32));
  return { encKey, macKey };
}

// AES-256-GCM. Output = base64( iv(12) || authTag(16) || ciphertext ).
function encryptPayload(obj, encKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
  const pt = Buffer.from(JSON.stringify(obj), 'utf8');
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

function hmac(value, macKey) {
  return crypto.createHmac('sha256', macKey).update(value).digest('hex');
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '';
}

// Returns true if the IP is over its hourly cap. Fails open (returns false) on error.
async function isRateLimited(baseUrl, serviceRole, ipHash) {
  try {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const url = `${baseUrl}/rest/v1/rate_limits?select=id&ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(since)}`;
    const r = await fetch(url, {
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}`, Prefer: 'count=exact' },
    });
    if (!r.ok) return false;
    // Prefer count=exact returns the count in the Content-Range header: "0-4/5".
    const range = r.headers.get('content-range');
    let count = NaN;
    if (range && range.includes('/')) count = parseInt(range.split('/')[1], 10);
    if (Number.isNaN(count)) { const rows = await r.json(); count = Array.isArray(rows) ? rows.length : 0; }
    return count >= RATE_LIMIT_MAX;
  } catch (_) {
    return false;
  }
}

async function recordAttempt(baseUrl, serviceRole, ipHash, action) {
  try {
    await fetch(`${baseUrl}/rest/v1/rate_limits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ ip_hash: ipHash, action }),
    });
  } catch (_) { /* best-effort */ }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!originAllowed(req.headers.origin)) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

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
  if (DISPOSABLE_DOMAINS.has(email.split('@')[1].toLowerCase())) {
    return res.status(400).json({ success: false, error: 'Please use a permanent email address' });
  }

  const personal = {
    email,
    firstName: clip(body.firstName, 100),
    lastName: clip(body.lastName, 100),
    subject: clip(body.subject, 200),
    message: clip(body.message, 5000),
    source: clip(body.source, 100),
    userAgent: clip(req.headers['user-agent'], 500),
  };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ENC_KEY_B64 = process.env.SUBMISSIONS_ENC_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO = process.env.INQUIRY_TO_EMAIL;
  const FROM = process.env.INQUIRY_FROM_EMAIL;

  if (!SUPABASE_URL || !SERVICE_ROLE || !ENC_KEY_B64) {
    console.error('Missing required env vars (Supabase URL / service role / encryption key)');
    return res.status(500).json({ success: false, error: 'Server not configured' });
  }

  // Derive keys (fail closed).
  let encKey, macKey;
  try {
    ({ encKey, macKey } = deriveKeys(ENC_KEY_B64));
  } catch (err) {
    console.error('Encryption key error:', err.message);
    return res.status(500).json({ success: false, error: 'Server not configured' });
  }

  // Per-IP rate limit (fails open on lookup error).
  const ipHash = hmac(clientIp(req) || 'unknown', macKey);
  if (await isRateLimited(SUPABASE_URL, SERVICE_ROLE, ipHash)) {
    return res.status(429).json({ success: false, error: 'Too many submissions. Please try again later.' });
  }

  // Encrypt then store (fail closed).
  let row;
  try {
    row = { type, email_hash: hmac(email.toLowerCase(), macKey), payload: encryptPayload(personal, encKey) };
  } catch (err) {
    console.error('Encryption error:', err.message);
    return res.status(500).json({ success: false, error: 'Server not configured' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      console.error('Supabase insert failed:', r.status, await r.text());
      return res.status(502).json({ success: false, error: 'Could not save submission' });
    }
  } catch (err) {
    console.error('Supabase insert error:', err);
    return res.status(502).json({ success: false, error: 'Could not save submission' });
  }

  // Record the attempt for rate limiting (best-effort, after a successful store).
  await recordAttempt(SUPABASE_URL, SERVICE_ROLE, ipHash, type);

  // Email notification via Resend (best-effort; the record is already saved).
  if (RESEND_API_KEY && TO && FROM) {
    const name = [personal.firstName, personal.lastName].filter(Boolean).join(' ') || '(no name given)';
    const lines = [
      ['Type', type], ['Email', email], ['Name', name],
      ['Subject', personal.subject], ['Source', personal.source], ['Message', personal.message],
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
          from: FROM, to: [TO], reply_to: email,
          subject: `Zari Vault: new ${type}${personal.subject ? ': ' + personal.subject : ''}`,
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

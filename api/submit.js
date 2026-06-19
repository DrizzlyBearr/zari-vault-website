// Vercel serverless function: /api/submit
//
// Receives form submissions (contact / waitlist / exit / download) from the
// browser, ENCRYPTS the personal data, stores the ciphertext in Supabase, and
// emails a plaintext notification via Resend.
//
// SECURITY MODEL
// - Runs server-side only. The browser never sees any secret.
// - Personal data (name, email, subject, message, source, user agent) is
//   encrypted with AES-256-GCM BEFORE it is written to Supabase. The key lives
//   only in Vercel env vars, never in the database. Anyone who bypasses Supabase
//   RLS (leaked service-role key, DB dump, insider) sees only ciphertext.
// - The database stores: type, created_at, an HMAC email_hash (for dedupe/lookup
//   without exposing the address), and the encrypted payload. No plaintext PII.
// - Fail closed: if the encryption key is missing, we refuse to store.
//
// Required environment variables (Vercel -> Project -> Settings -> Environment Variables):
//   SUPABASE_URL                e.g. https://azaxixarojnjgjgxhsyp.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   Supabase -> Project Settings -> API -> service_role (secret)
//   SUBMISSIONS_ENC_KEY         base64 of 32 random bytes: `openssl rand -base64 32`
//   RESEND_API_KEY              Resend -> API Keys
//   INQUIRY_TO_EMAIL            where notifications are sent, e.g. hello@zarivault.co.za
//   INQUIRY_FROM_EMAIL          verified Resend sender, e.g. "Zari Vault <noreply@zarivault.co.za>"

const crypto = require('crypto');

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

// Derive independent encryption + MAC keys from the single master secret so we
// never reuse the raw key directly for two purposes.
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
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

function hashEmail(email, macKey) {
  return crypto.createHmac('sha256', macKey).update(email.trim().toLowerCase()).digest('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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

  // Personal data that will be encrypted before storage.
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

  // Encrypt before storage. Fail closed if anything is wrong with the key.
  let row;
  try {
    const { encKey, macKey } = deriveKeys(ENC_KEY_B64);
    row = { type, email_hash: hashEmail(email, macKey), payload: encryptPayload(personal, encKey) };
  } catch (err) {
    console.error('Encryption error:', err.message);
    return res.status(500).json({ success: false, error: 'Server not configured' });
  }

  // 1) Store encrypted record in Supabase (source of truth).
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

  // 2) Email notification via Resend (best-effort; the record is already saved).
  if (RESEND_API_KEY && TO && FROM) {
    const name = [personal.firstName, personal.lastName].filter(Boolean).join(' ') || '(no name given)';
    const lines = [
      ['Type', type],
      ['Email', email],
      ['Name', name],
      ['Subject', personal.subject],
      ['Source', personal.source],
      ['Message', personal.message],
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

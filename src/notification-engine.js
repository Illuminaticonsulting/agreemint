/**
 * AgreeMint — Notification Engine
 *
 * Handles email notifications for agreement lifecycle events:
 * - Agreement sent for signature
 * - Agreement signed by a party
 * - All parties signed (fully executed)
 * - Dispute raised
 * - Dispute resolved
 * - Escrow funded / released
 *
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   Or use SMTP_URL for a connection string
 *   Set NOTIFY_ENABLED=true to activate
 */

const nodemailer = require('nodemailer');

// ─── Config ─────────────────────────────────────────────
const NOTIFY_ENABLED = process.env.NOTIFY_ENABLED === 'true';
const SMTP_FROM = process.env.SMTP_FROM || 'AgreeMint <noreply@kingpinstrategies.com>';
const BASE_URL = process.env.BASE_URL || 'https://docs.kingpinstrategies.com';

let transporter = null;

function initTransport() {
  if (!NOTIFY_ENABLED) return null;

  const config = process.env.SMTP_URL
    ? { url: process.env.SMTP_URL }
    : {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

  try {
    transporter = nodemailer.createTransport(config);
    console.log('  Email notifications: ENABLED');
    return transporter;
  } catch (e) {
    console.log('  Email notifications: FAILED -', e.message);
    return null;
  }
}

// ─── Send Email ─────────────────────────────────────────
async function sendEmail(to, subject, html, text) {
  if (!NOTIFY_ENABLED || !transporter) {
    console.log(`[NOTIFY] Would email ${to}: ${subject}`);
    return { sent: false, reason: 'notifications_disabled' };
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: `AgreeMint: ${subject}`,
      html,
      text: text || subject
    });
    console.log(`[NOTIFY] Email sent to ${to}: ${subject} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (e) {
    console.error(`[NOTIFY] Email failed to ${to}:`, e.message);
    return { sent: false, error: e.message };
  }
}

// ─── Email Templates ────────────────────────────────────

function emailWrapper(title, body) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:20px auto;background:#111;border-radius:12px;border:1px solid #222;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#b8860b,#daa520);padding:20px 30px;">
      <h1 style="margin:0;color:#000;font-size:20px;">🤝 AgreeMint</h1>
    </div>
    <div style="padding:30px;">
      <h2 style="color:#fff;margin:0 0 20px;">${title}</h2>
      <div style="color:#aaa;font-size:14px;line-height:1.8;">
        ${body}
      </div>
    </div>
    <div style="padding:20px 30px;border-top:1px solid #222;font-size:11px;color:#666;text-align:center;">
      AgreeMint — AI-Powered Agreement Platform &middot; <a href="${BASE_URL}" style="color:#b8860b;">docs.kingpinstrategies.com</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Notification Functions ─────────────────────────────

/**
 * Notify parties that an agreement has been sent for signature
 */
async function notifyAgreementSent(agreement) {
  const results = [];
  const signUrl = `${BASE_URL}/sign/${agreement.id}?token=${agreement.verificationToken}`;

  for (const party of (agreement.parties || [])) {
    if (!party.email) continue;

    const html = emailWrapper('Agreement Ready for Your Signature', `
      <p style="color:#fff;font-weight:600;">"${agreement.title}"</p>
      <p>You have been asked to review and sign this agreement.</p>
      <p><strong>Type:</strong> ${agreement.type}<br>
         <strong>Jurisdiction:</strong> ${agreement.jurisdiction}<br>
         <strong>Parties:</strong> ${(agreement.parties || []).map(p => p.name).join(', ')}</p>
      <div style="margin:24px 0;">
        <a href="${signUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#b8860b,#daa520);color:#000;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
          ✍️ Review & Sign
        </a>
      </div>
      <p style="font-size:12px;color:#666;">This link is unique to this agreement. Do not share it.</p>
    `);

    const r = await sendEmail(party.email, `Sign: ${agreement.title}`, html);
    results.push({ email: party.email, ...r });
  }

  return results;
}

/**
 * Notify that a party has signed
 */
async function notifyPartySigned(agreement, signerName, signerEmail) {
  const results = [];

  for (const party of (agreement.parties || [])) {
    if (!party.email || party.email === signerEmail) continue;

    const html = emailWrapper('A Party Has Signed', `
      <p style="color:#fff;font-weight:600;">"${agreement.title}"</p>
      <p><strong>${signerName}</strong> (${signerEmail}) has signed this agreement.</p>
      <p><strong>Signatures:</strong> ${agreement.signatures.length} of ${agreement.parties.length} parties</p>
      ${agreement.status === 'signed'
        ? '<p style="color:#22c55e;font-weight:700;font-size:16px;">✅ All parties have signed! The agreement is now fully executed.</p>'
        : '<p style="color:#f59e0b;">⏳ Waiting for remaining signatures.</p>'
      }
      <div style="margin:24px 0;">
        <a href="${BASE_URL}/verify/${agreement.id}" style="display:inline-block;padding:12px 28px;background:#333;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          View Agreement
        </a>
      </div>
    `);

    const r = await sendEmail(party.email, `Signed: ${agreement.title}`, html);
    results.push({ email: party.email, ...r });
  }

  return results;
}

/**
 * Notify all parties that a dispute has been raised
 */
async function notifyDisputeRaised(agreement, raisedBy, reason) {
  const results = [];

  for (const party of (agreement.parties || [])) {
    if (!party.email) continue;

    const html = emailWrapper('⚠️ Dispute Raised', `
      <p style="color:#fff;font-weight:600;">"${agreement.title}"</p>
      <p style="color:#ef4444;font-weight:600;">A dispute has been raised on this agreement.</p>
      <p><strong>Raised by:</strong> ${raisedBy}</p>
      <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
      <p><strong>Dispute Window:</strong> ${agreement.escrow?.rules?.disputeWindowDays || 7} days to resolve</p>
      <div style="margin:20px 0;padding:16px;background:#1a0000;border:1px solid #ef4444;border-radius:8px;">
        <p style="color:#ef4444;margin:0;font-size:13px;">
          Both parties should attempt to resolve the dispute. If no resolution is reached, the designated arbiter will make a final decision.
        </p>
      </div>
      <div style="margin:24px 0;">
        <a href="${BASE_URL}/verify/${agreement.id}" style="display:inline-block;padding:12px 28px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          View Dispute Details
        </a>
      </div>
    `);

    const r = await sendEmail(party.email, `⚠️ Dispute: ${agreement.title}`, html);
    results.push({ email: party.email, ...r });
  }

  return results;
}

/**
 * Notify all parties that a dispute has been resolved
 */
async function notifyDisputeResolved(agreement, resolution, resolvedBy) {
  const results = [];

  for (const party of (agreement.parties || [])) {
    if (!party.email) continue;

    const html = emailWrapper('Dispute Resolved', `
      <p style="color:#fff;font-weight:600;">"${agreement.title}"</p>
      <p style="color:#22c55e;font-weight:600;">The dispute has been resolved.</p>
      <p><strong>Resolution:</strong> ${resolution}</p>
      <p><strong>Resolved by:</strong> ${resolvedBy}</p>
      ${agreement.escrow ? '<p><strong>Escrow status:</strong> ' + (agreement.escrow.status || 'pending') + '</p>' : ''}
      <div style="margin:24px 0;">
        <a href="${BASE_URL}/verify/${agreement.id}" style="display:inline-block;padding:12px 28px;background:#22c55e;color:#000;text-decoration:none;border-radius:8px;font-weight:600;">
          View Agreement
        </a>
      </div>
    `);

    const r = await sendEmail(party.email, `Resolved: ${agreement.title}`, html);
    results.push({ email: party.email, ...r });
  }

  return results;
}

/**
 * Notify escrow events (funded, released, refunded)
 */
async function notifyEscrowEvent(agreement, event, details) {
  const results = [];
  const eventLabels = {
    funded: '💰 Escrow Funded',
    released: '✅ Escrow Released',
    refunded: '↩️ Escrow Refunded',
    accepted: '🤝 Escrow Terms Accepted'
  };

  for (const party of (agreement.parties || [])) {
    if (!party.email) continue;

    const html = emailWrapper(eventLabels[event] || 'Escrow Update', `
      <p style="color:#fff;font-weight:600;">"${agreement.title}"</p>
      <p><strong>Event:</strong> ${eventLabels[event] || event}</p>
      <p><strong>Amount:</strong> ${agreement.escrow?.amount || '?'} ${agreement.escrow?.currency || ''}</p>
      ${details ? '<p>' + details + '</p>' : ''}
      <div style="margin:24px 0;">
        <a href="${BASE_URL}/verify/${agreement.id}" style="display:inline-block;padding:12px 28px;background:#333;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          View Agreement
        </a>
      </div>
    `);

    const r = await sendEmail(party.email, `Escrow: ${agreement.title}`, html);
    results.push({ email: party.email, ...r });
  }

  return results;
}

module.exports = {
  initTransport,
  sendEmail,
  notifyAgreementSent,
  notifyPartySigned,
  notifyDisputeRaised,
  notifyDisputeResolved,
  notifyEscrowEvent
};

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

/**
 * Outbound email.
 *
 * The deployment has carried a fully populated MAIL_* block since before this
 * project was ported to Node, but no mail library was ever installed — so the
 * contact form's "reply" was written to the database and never delivered, and
 * no password-reset flow could exist at all (MEL2-BIZ-002).
 *
 * Every send is best-effort and returns a result rather than throwing: an
 * administrator's reply is already stored by the time we get here, and a
 * mail-server outage must not lose it or fail their request.
 */

let transporter = null;
let transporterKey = '';

function mailConfig() {
  return {
    host: process.env.MAIL_HOST || '',
    port: Number(process.env.MAIL_PORT || 587),
    user: process.env.MAIL_USERNAME || '',
    pass: process.env.MAIL_PASSWORD || '',
    // "tls" means STARTTLS on 587; port 465 is implicit TLS.
    encryption: String(process.env.MAIL_ENCRYPTION || 'tls').toLowerCase(),
    fromAddress: process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || '',
    fromName: process.env.MAIL_FROM_NAME || process.env.APP_NAME || 'Melka Oda General Hospital',
  };
}

export function mailConfigured() {
  const c = mailConfig();
  return Boolean(c.host && c.user && c.pass && c.fromAddress);
}

function getTransporter() {
  const c = mailConfig();
  if (!mailConfigured()) return null;

  // Rebuild only when the configuration actually changes, so a rotated
  // password takes effect without a restart but the pool is otherwise reused.
  const key = `${c.host}:${c.port}:${c.user}:${c.encryption}:${c.pass.length}`;
  if (transporter && transporterKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465 || c.encryption === 'ssl',
    auth: { user: c.user, pass: c.pass },
    requireTLS: c.encryption === 'tls' && c.port !== 465,
    pool: true,
    maxConnections: 2,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  transporterKey = key;
  return transporter;
}

/** Minimal HTML escape for values interpolated into a mail body. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function sendMail({ to, subject, html, text, replyTo }) {
  const c = mailConfig();
  const tx = getTransporter();
  if (!tx) {
    return { sent: false, reason: 'Mail is not configured on this server' };
  }
  if (!to) return { sent: false, reason: 'No recipient address' };

  try {
    await tx.sendMail({
      from: `"${c.fromName}" <${c.fromAddress}>`,
      to,
      subject,
      text,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    logger.info('mail_sent', { subject });
    return { sent: true };
  } catch (err) {
    // The address is logged, the body is not.
    logger.error('mail_failed', { subject, error: err.message });
    return { sent: false, reason: 'The mail server rejected the message' };
  }
}

const SIGNATURE = () =>
  process.env.APP_NAME || 'Melka Oda General Hospital';

/** Reply to a contact-form submission. */
export async function sendContactReply(submission, replyMessage) {
  const name = submission.name || 'there';
  const subject = `Re: ${submission.subject || 'Your enquiry'}`;

  // `replyMessage` is authored in the admin rich-text editor and may already be
  // HTML; the plain-text alternative strips tags rather than guessing.
  const html = `<p>Dear ${esc(name)},</p>
<p>Thank you for contacting ${esc(SIGNATURE())}. This is our reply to your message:</p>
<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #17606b;background:#f4f7f7">${replyMessage}</blockquote>
<p>If you need anything further, simply reply to this email.</p>
<p>— ${esc(SIGNATURE())}</p>`;

  const text = `Dear ${name},

Thank you for contacting ${SIGNATURE()}. This is our reply to your message:

${String(replyMessage).replace(/<[^>]+>/g, '').trim()}

If you need anything further, simply reply to this email.

— ${SIGNATURE()}`;

  return sendMail({ to: submission.email, subject, html, text });
}

/** Acknowledge a job application so the applicant knows it arrived. */
export async function sendApplicationReceipt(application, careerTitle) {
  const subject = `We received your application — ${careerTitle}`;
  const name = `${application.first_name || ''} ${application.last_name || ''}`.trim() || 'there';

  const html = `<p>Dear ${esc(name)},</p>
<p>Thank you for applying for the position of <strong>${esc(careerTitle)}</strong> at ${esc(SIGNATURE())}. Your application has been received and is now with our recruitment team.</p>
<p>We review every application and will contact you if we would like to take things further. Please keep this email for your records.</p>
<p>— ${esc(SIGNATURE())}</p>`;

  const text = `Dear ${name},

Thank you for applying for the position of ${careerTitle} at ${SIGNATURE()}. Your application has been received and is now with our recruitment team.

We review every application and will contact you if we would like to take things further.

— ${SIGNATURE()}`;

  return sendMail({ to: application.email, subject, html, text });
}

/** Confirm an event registration. */
export async function sendEventRegistrationReceipt(registration, event) {
  const subject = `You are registered — ${event.title}`;
  const when = event.event_date
    ? `<p><strong>When:</strong> ${esc(event.event_date)}${event.event_time ? ` at ${esc(event.event_time)}` : ''}</p>`
    : '';
  const where = event.location ? `<p><strong>Where:</strong> ${esc(event.location)}</p>` : '';

  const html = `<p>Dear ${esc(registration.name)},</p>
<p>Your registration for <strong>${esc(event.title)}</strong> has been received.</p>
${when}${where}
<p>We will be in touch if any details change.</p>
<p>— ${esc(SIGNATURE())}</p>`;

  const text = `Dear ${registration.name},

Your registration for ${event.title} has been received.
${event.event_date ? `\nWhen: ${event.event_date}${event.event_time ? ` at ${event.event_time}` : ''}` : ''}${event.location ? `\nWhere: ${event.location}` : ''}

We will be in touch if any details change.

— ${SIGNATURE()}`;

  return sendMail({ to: registration.email, subject, html, text });
}

/** Password-reset link. Single-use token, expiry stated in the body. */
export async function sendPasswordReset(user, resetUrl, expiresMinutes) {
  const subject = `Reset your ${SIGNATURE()} password`;

  const html = `<p>Dear ${esc(user.name || 'there')},</p>
<p>A password reset was requested for this account. Use the link below to choose a new password. It can be used once and expires in ${expiresMinutes} minutes.</p>
<p><a href="${esc(resetUrl)}">Reset your password</a></p>
<p>If you did not request this, no action is needed — your password has not changed.</p>
<p>— ${esc(SIGNATURE())}</p>`;

  const text = `Dear ${user.name || 'there'},

A password reset was requested for this account. Use the link below to choose a new password. It can be used once and expires in ${expiresMinutes} minutes.

${resetUrl}

If you did not request this, no action is needed — your password has not changed.

— ${SIGNATURE()}`;

  return sendMail({ to: user.email, subject, html, text });
}

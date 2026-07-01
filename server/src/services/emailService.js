import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getResetBaseUrl = () => {
  const configuredOrigins = env.clientUrl.split(',').map((item) => item.trim()).filter(Boolean);
  return (configuredOrigins.find((origin) => !origin.includes('*')) || configuredOrigins[0] || 'http://localhost:5173').replace(/\/+$/, '');
};

export async function sendPasswordResetEmail(user, token) {
  if (!process.env.SMTP_HOST) {
    if (env.nodeEnv === 'production') throw new Error('SMTP is not configured');
    return false;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
  });
  const resetUrl = `${getResetBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(user.name);
  const safeResetUrl = escapeHtml(resetUrl);
  await transport.sendMail({
    from: process.env.MAIL_FROM || 'SAS Academy <no-reply@example.com>',
    to: user.email,
    subject: 'Reset your SAS Academy password',
    text: `Hello ${user.name},\n\nReset your password using this secure link (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${safeName},</p><p>Use the link below to reset your SAS Academy password. It is valid for 15 minutes.</p><p><a href="${safeResetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
  });
  return true;
}

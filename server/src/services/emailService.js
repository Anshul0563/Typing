import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

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
  const resetUrl = `${env.clientUrl.split(',')[0]}/reset-password?token=${encodeURIComponent(token)}`;
  await transport.sendMail({
    from: process.env.MAIL_FROM || 'SAS Academy <no-reply@example.com>',
    to: user.email,
    subject: 'Reset your SAS Academy password',
    text: `Hello ${user.name},\n\nReset your password using this secure link (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${user.name},</p><p>Use the link below to reset your SAS Academy password. It is valid for 15 minutes.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
  });
  return true;
}

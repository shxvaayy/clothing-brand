import nodemailer from "nodemailer";

export function emailConfigured() {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
}

export async function sendMail(params: { to: string; subject: string; html: string }) {
  if (!emailConfigured()) {
    console.log(`[email skipped — SMTP not configured] to=${params.to} subject="${params.subject}"`);
    return { sent: false as const };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  return { sent: true as const };
}

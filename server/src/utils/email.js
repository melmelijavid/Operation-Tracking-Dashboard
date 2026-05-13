// Email sender. Two modes:
//
//   - Production: SMTP_HOST is set in env. Uses real SMTP credentials and
//     sends to the recipient's actual inbox.
//
//   - Development: SMTP_HOST is empty. On first send we ask Ethereal
//     (https://ethereal.email/) for a throwaway test account, send the
//     mail through their fake SMTP, and log the preview URL so you can
//     view the rendered email in the browser.
//
// The transporter is created lazily and cached, so the Ethereal call only
// happens once per process.

import nodemailer from 'nodemailer';

let transporterPromise = null;

async function buildTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  // Dev fallback. Ethereal returns SMTP creds we plug into nodemailer.
  const testAccount = await nodemailer.createTestAccount();
  console.log(
    `[email] No SMTP_HOST configured. Using Ethereal test inbox: ${testAccount.user}\n` +
    `        Sent emails will appear at https://ethereal.email/messages (preview URL printed per send).`
  );
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

function getTransporter() {
  if (!transporterPromise) transporterPromise = buildTransporter();
  return transporterPromise;
}

const DEFAULT_FROM = 'Operation Tracking <no-reply@operationtracking.local>';

export async function sendEmail({ to, subject, text, html }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to,
    subject,
    text,
    html,
  });

  // Ethereal sends back a preview URL we can follow to view the rendered email.
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[email] Preview: ${previewUrl}`);
  }

  return info;
}

import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || '';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';

let transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: user && pass ? { user, pass } : undefined,
});

export async function sendMail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}) {
  const from = options.from || process.env.MAIL_FROM || 'no-reply@example.com';

  const info = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  return info;
}

export default { sendMail };

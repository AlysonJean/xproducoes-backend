import nodemailer from 'nodemailer';
import logger from '../config/logger';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || '';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  logger.info({
    host,
    port,
    secure,
    auth: user ? '*** provided ***' : 'none'
  }, 'Initializing Nodemailer Transporter');

  transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      ciphers: 'SSLv3', // Necessário para alguns serviços como GoDaddy/Outlook
      rejectUnauthorized: false
    }
  });

  return transporter;
};

export async function sendMail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}) {
  const from = options.from || process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';
  
  try {
    const info = await getTransporter().sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    
    logger.info({ messageId: info.messageId }, 'Email sent successfully');
    return info;
  } catch (error) {
    logger.error({ error }, 'Error sending email');
    throw error;
  }
}

export default { sendMail };

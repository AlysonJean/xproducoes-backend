import nodemailer, { Transporter } from 'nodemailer';
import { EmailTemplates } from '../templates/emailTemplates';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER;
const FROM = EMAIL_FROM || SMTP_USER;

export class EmailService {
  private transporter?: nodemailer.Transporter;

  constructor() {
  const useEthereal = process.env.USE_ETHEREAL === 'true';
    // init with safe transporter to avoid uninitialized errors
    this.transporter = nodemailer.createTransport({ jsonTransport: true } as any);
    // If SMTP is configured and not forcing Ethereal, use it synchronously
    if (!useEthereal && SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    }
  }

  // async initializer to create Ethereal account when requested
  async init() {
    const useEthereal = process.env.USE_ETHEREAL === 'true';
    if (useEthereal) {
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
        console.info('Ethereal account created for emails:', testAccount.user);
      } catch (e) {
        console.warn('Failed to create Ethereal account, keeping jsonTransport', e);
      }
    }
    // if not using ethereal and transporter is still jsonTransport, keep it
  }

  async sendMail(to: string, subject: string, html: string, text?: string) {
    if (!this.transporter) {
      throw new Error('Email transporter is not initialized');
    }
    const info = await this.transporter.sendMail({ from: FROM, to, subject, html, text });
    try {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.info('Preview URL:', url);
    } catch {
      // ignore
    }
    return info;
  }

  async sendInviteEmail(to: string, inviteUrl: string, tempPassword?: string) {
    const subject = 'Convite para completar cadastro - X-Produções';
    const text = `Você foi convidado a criar sua conta. Acesse: ${inviteUrl}${tempPassword ? `\nSenha temporária: ${tempPassword}` : ''}`;
    const html = `<p>Olá,</p><p>Você foi convidado a completar seu cadastro na plataforma X-Produções.</p><p><a href="${inviteUrl}">Clique aqui para completar seu registro</a></p>${tempPassword ? `<p>Senha temporária: <strong>${tempPassword}</strong></p>` : ''}<p>O link expira em 24 horas.</p>`;
    return this.sendMail(to, subject, html, text);
  }

  async sendPasswordResetEmail(
    email: string, 
    name: string, 
    resetUrl: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const template = EmailTemplates.passwordReset({
      userName: name,
      resetUrl,
      expiresIn: '1 hora',
      ipAddress,
      userAgent
    });
    
    return this.sendMail(email, template.subject, template.html, template.text);
  }

  async sendPasswordChangedEmail(
    email: string,
    name: string,
    ipAddress?: string
  ) {
    const template = EmailTemplates.passwordChanged(name, ipAddress);
    return this.sendMail(email, template.subject, template.html, template.text);
  }

  // métodos auxiliares para notificações podem ser adicionados aqui

  async sendBookingConfirmation(user: any, booking: any) {
    const mailOptions = {
      from: FROM,
      to: user.email,
      subject: `Confirmação da sua Reserva #${String(booking.id).substring(0, 8)}`,
      html: `
        <h1>Olá, ${user.name}!</h1>
        <p>A sua reserva foi recebida e está agora pendente de confirmação.</p>
        <p><strong>Detalhes do Pedido:</strong></p>
        <ul>
          ${(booking.equipments || []).map((eq: any) => `<li>${eq.name}</li>`).join("")}
        </ul>
        <p><strong>Total:</strong> R$ ${Number(booking.totalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p>Obrigado!</p>
      `,
    };
    return this.sendMail(user.email, mailOptions.subject, mailOptions.html);
  }

  async sendStatusUpdate(user: any, booking: any) {
    const html = `
      <h1>Olá, ${user.name}!</h1>
      <p>O estado da sua reserva foi atualizado para: <strong>${booking.status}</strong></p>
    `;
    return this.sendMail(user.email, `Atualização da sua Reserva #${String(booking.id).substring(0, 8)}`, html);
  }

  async sendCollaboratorInviteEmail(email: string, name: string, inviteUrl: string) {
    const html = `
      <h1>Olá, ${name}!</h1>
      <p>Foi convidado para se juntar à equipa da X Produçoes e Eventos como colaborador!</p>
      <p>Para completar o seu registo e definir a sua senha, clique no link abaixo:</p>
      <p><a href="${inviteUrl}">Completar Registo</a></p>
    `;
    return this.sendMail(email, 'Convite para Colaborador - X Produçoes e Eventos', html);
  }

  async sendVerificationEmail(email: string, verifyUrl: string) {
    const subject = 'Verifique seu endereço de e-mail - X-Produções';
    const html = `<p>Olá,</p><p>Por favor, confirme seu endereço de e-mail clicando no link abaixo:</p><p><a href="${verifyUrl}">Verificar e-mail</a></p><p>Se não solicitou este e-mail, ignore.</p>`;
    const text = `Verifique seu e-mail: ${verifyUrl}`;
    return this.sendMail(email, subject, html, text);
  }
}

const emailServiceInstance = new EmailService();
export default emailServiceInstance;

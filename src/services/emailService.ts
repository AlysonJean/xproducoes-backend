import nodemailer from 'nodemailer';
import { EmailTemplates } from '../templates/emailTemplates';
import logger from "../config/logger";
import { AppError } from "../utils/errors";


const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
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
        secure: SMTP_SECURE, // true para porta 465 (SSL), false para 587 (TLS)
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
        logger.info({obj:testAccount.user}, 'Ethereal account created for emails:');
      } catch (e) {
        logger.warn({obj:e}, 'Failed to create Ethereal account, keeping jsonTransport');
      }
    }
    // if not using ethereal and transporter is still jsonTransport, keep it
  }

  async sendMail(to: string, subject: string, html: string, text?: string) {
    if (!this.transporter) {
      throw new AppError('Email transporter is not initialized', 503, true, 'EMAIL_TRANSPORT_NOT_INITIALIZED');
    }
    const info = await this.transporter.sendMail({ from: FROM, to, subject, html, text });
    try {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) logger.info({obj:url}, 'Preview URL:');
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
      subject: `Solicitação da sua Reserva #${String(booking.id).substring(0, 8)}`,
      html: `
        <h1>Olá, ${user.name}!</h1>
        <p>A sua reserva foi recebida e está agora aguardando confirmação da equipe.</p>
        <p><strong>Detalhes do Pedido:</strong></p>
        <ul>
          ${(booking.equipments || []).map((eq: any) => `<li>${eq.name}</li>`).join("")}
        </ul>
        <p><strong>Total Estimado:</strong> R$ ${Number(booking.totalPrice || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p>Você será notificado assim que confirmarmos a disponibilidade.</p>
      `,
    };
    return this.sendMail(user.email, mailOptions.subject, mailOptions.html);
  }

  async sendBookingApproved(user: { name: string; email: string }, booking: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://xproducoeseeventos.com.br';
    const bookingUrl = `${frontendUrl}/cliente/reservas/${booking.id}`;
    
    // Gerar link formatado do GCal seria ideal aqui, mas vamos focar no link da plataforma
    
    const subject = `Reserva Confirmada! #${String(booking.id).substring(0, 8)}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Sua reserva foi confirmada! 🎉</h1>
        <p>Olá, <strong>${user.name}</strong>.</p>
        <p>Temos o prazer de informar que sua reserva para <strong>${booking.eventTitle || 'Seu Evento'}</strong> está confirmada.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date(booking.eventDate).toLocaleDateString('pt-BR')} às ${new Date(booking.eventDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
          <p style="margin: 5px 0;"><strong>Local:</strong> ${booking.location || 'A definir'}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Confirmada</span></p>
        </div>

        <p>Já adicionamos este evento à sua agenda (se você conectou sua conta Google).</p>
        
        <p>
          <a href="${bookingUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Ver Detalhes da Reserva
          </a>
        </p>
      </div>
    `;
    
    return this.sendMail(user.email, subject, html);
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

  async sendAssignmentNotification(
    email: string,
    collaboratorName: string,
    eventDetails: {
      eventName: string;
      eventDate: string;
      eventTime: string;
      role: string;
      location: string;
      bookingUrl: string;
    }
  ) {
    const template = EmailTemplates.assignmentNotification(
      collaboratorName,
      eventDetails.eventName,
      eventDetails.eventDate,
      eventDetails.eventTime,
      eventDetails.role,
      eventDetails.location,
      eventDetails.bookingUrl
    );

    return this.sendMail(email, template.subject, template.html, template.text);
  }

  async sendBookingReminder(
    email: string,
    clientName: string,
    eventDetails: {
      id: string;
      title: string;
      date: string;
      time: string;
      location: string;
      googleCalendarLink: string;
    }
  ) {
    const bookingUrl = `https://xproducoeseeventos.com.br/cliente/reservas/${eventDetails.id}`;
    
    const template = EmailTemplates.bookingReminder(
      clientName,
      eventDetails.title,
      eventDetails.date,
      eventDetails.time,
      eventDetails.location,
      bookingUrl,
      eventDetails.googleCalendarLink
    );

    return this.sendMail(email, template.subject, template.html, template.text);
  }
}

const emailServiceInstance = new EmailService();
export default emailServiceInstance;

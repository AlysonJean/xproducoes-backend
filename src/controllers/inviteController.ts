import { Request, Response } from 'express';
import { prisma } from '../config/database';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import emailService from '../services/emailService';
import logger from "../config/logger";


const INVITE_EXPIRATION_HOURS = parseInt(process.env.INVITE_EXPIRATION_HOURS || '72', 10);

export async function sendInvite(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email é obrigatório' });
    }

    // gerar token
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_HOURS * 60 * 60 * 1000);

    const invite = await prisma.inviteToken.create({
      data: { token, email, invitedBy: (req as any).userId || null, expiresAt },
    });

    // construir link de registro — frontend deve ter rota para completar registro
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const registrationLink = `${frontendBase}/auth/register?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    // enviar email
    const subject = 'Você foi convidado para se juntar à plataforma';
    const html = `<p>Você foi convidado a se registrar. Clique no link abaixo para completar o cadastro:</p><p><a href="${registrationLink}">Registrar-se</a></p>`;

    let emailSent = false;
    try {
      await emailService.sendMail(email, subject, html);
      emailSent = true;
    } catch (emailError) {
      logger.error({ obj: emailError }, 'Falha ao enviar email do convite, mas token foi gerado.');
    }

    return res.status(201).json({ 
      success: true, 
      data: { 
        inviteId: invite.id,
        inviteUrl: registrationLink,
        emailSent 
      }, 
      message: emailSent ? 'Convite enviado por e-mail' : 'Convite gerado (e-mail falhou)',
      warning: emailSent ? undefined : 'Não foi possível enviar o e-mail. Copie o link abaixo.'
    });
  } catch (error) {
    logger.error({obj:error}, 'Erro ao processar convite:');
    return res.status(500).json({ success: false, message: 'Erro interno ao gerar convite' });
  }
}

// Rota pública para registrar-se a partir de um convite
export async function registerFromInvite(req: Request, res: Response) {
  try {
    const { token, email, name, password } = req.body;
    if (!token || !email || !name || !password) {
      return res.status(400).json({ success: false, message: 'Token, email, nome e senha são obrigatórios' });
    }

  const invite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!invite) {
      return res.status(400).json({ success: false, message: 'Token inválido' });
    }
    if (invite.used) {
      return res.status(400).json({ success: false, message: 'Token já utilizado' });
    }
    if (invite.email !== email) {
      return res.status(400).json({ success: false, message: 'Email não corresponde ao convite' });
    }
    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Token expirado' });
    }

    // criar usuário e collaborator se necessário
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Usuário já existe' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'COLLABORATOR',
      },
    });

    // criar perfil de colaborador vazio
    await prisma.collaborator.create({
      data: {
        userId: user.id,
        collaboratorRole: 'OTHER',
        specialties: [],
        status: 'PENDING_APPROVAL',
        equipment: [],
        certifications: [],
        languages: [],
      },
    });

  await prisma.inviteToken.update({ where: { id: invite.id }, data: { used: true } });

    return res.status(201).json({ success: true, data: { userId: user.id }, message: 'Registro concluído' });
  } catch (error) {
    logger.error({obj:error}, 'Erro ao registrar a partir do convite:');
    return res.status(500).json({ success: false, message: 'Erro ao registrar' });
  }
}

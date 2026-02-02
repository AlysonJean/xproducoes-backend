// Listar todos os clientes (role CLIENT)
export async function findAllClients() {
  return prisma.user.findMany({
    where: { role: "CLIENT" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

// Deletar usuário por ID
export async function deleteUser(userId: string | number) {
  return prisma.user.delete({ where: { id: String(userId) } });
}

// Buscar usuário por ID
export async function getUserById(id: number) {
  return prisma.user.findUnique({ 
    where: { id: String(id) },
  select: { id: true, name: true, email: true, role: true, createdAt: true, isVip: true }
  });
}

// Buscar todos os usuários com paginação
export async function getAllUsers(options: { page: number; limit: number; search?: string }) {
  const { page, limit, search } = options;
  const skip = (page - 1) * limit;
  
  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } }
    ]
  } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    }),
    prisma.user.count({ where })
  ]);

  return { users, total, page, limit };
}

// Atualizar role do usuário
export async function updateUserRole(id: number, role: UserRole) {
  return prisma.user.update({
    where: { id: String(id) },
    data: { role }
  });
}

// Obter total de usuários
export async function getTotalUsers() {
  return prisma.user.count();
}

// Métodos adicionais para o authService
export async function requestPasswordReset(email: string, ipAddress?: string, userAgent?: string) {
  // Segurança: O cliente solicitou mensagens assertivas para melhor UX.
  // Permitindo retorno de erro caso usuário não exista.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    try {
      logger.info(`requestPasswordReset called for non-existing email: ${email}`);
    } catch {
      // noop
    }
    throw new Error('Usuário não encontrado');
  }

  // Gerar token de reset (mais seguro - 64 caracteres)
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetTokenExpiry: resetTokenExpiry,
    },
  });

  // Enviar email com link seguro para reset (não bloquear o fluxo se o envio falhar)
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await (await import('./emailService')).default.sendPasswordResetEmail(
      user.email, 
      user.name || 'Usuário', 
      resetUrl,
      ipAddress,
      userAgent
    );
  } catch (e) {
    logger.warn({obj:e}, 'Falha ao enviar email de reset:');
  }

  // Não retornar o token no corpo da resposta
  return { success: true };
}

export async function generateEmailVerificationToken(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.user.update({ where: { id: userId }, data: { emailVerificationToken: token, emailVerificationTokenExpiry: expiry } });
  return token;
}

export async function verifyEmailByToken(token: string) {
  const user = await prisma.user.findFirst({ where: { emailVerificationToken: token, emailVerificationTokenExpiry: { gte: new Date() } } });
  if (!user) throw new Error('Token inválido ou expirado');
  await prisma.user.update({ where: { id: user.id }, data: { verified: true, emailVerificationToken: null, emailVerificationTokenExpiry: null } });
  return true;
}

export async function resendEmailVerification(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Usuário não encontrado');
  if (user.verified) throw new Error('E-mail já verificado');
  const token = await generateEmailVerificationToken(userId);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
  try {
    await (await import('./emailService')).default.sendVerificationEmail(user.email, verifyUrl);
  } catch (e) {
    logger.warn({obj:e}, 'Falha ao enviar e-mail de verificação:');
  }
  return { success: true };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar senha atual
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error("Senha atual incorreta");
  }
  
  // Atualizar senha
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword }
  });
  
  return true;
}

import { prisma } from "../config/prisma";
import type { UserRole, Prisma } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config as envConfig } from "../config/environment";
import logger from "../config/logger";


// Use centralized, cryptographically generated secret from environment config
const config = { jwtSecret: envConfig.jwtSecret };

export type RegisterInput = { name: string; email: string; password: string };
export type LoginInput = { email: string; password: string };

export async function register(data: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new Error("Email já está em uso.");
  const hash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash: hash },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  // Cria perfil de cliente por padrão (não bloqueante)
  try {
    await prisma.client.create({ data: { userId: user.id } });
  } catch (e) {
    logger.warn({obj:e}, 'Falha ao criar perfil de cliente (não bloqueante):');
  }
  // Envia e-mail de verificação (não bloqueante)
  try {
    const token = await generateEmailVerificationToken(user.id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
    await (await import('./emailService')).default.sendVerificationEmail(user.email, verifyUrl);
  } catch (e) {
    logger.warn({obj:e}, 'Falha ao enviar e-mail de verificação (não bloqueante):');
  }
  return { ...user, needsEmailVerification: true } as const;
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new Error("Usuário não encontrado");
  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new Error("Senha inválida");
  // Exigir verificação de e-mail se habilitado por ambiente
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.verified) {
    const err = new Error('E-mail não verificado') as Error & { code?: string };
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: "15m" }, // Access token com 15 minutos
  );

  // Gerar refresh token com expiração maior
  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }, // Refresh token com 7 dias
  );
  
  // Adicionar rota de redirecionamento baseada no role
  let dashboardRoute = '/dashboard';
  const userRole = user.role;
  switch (userRole) {
    case 'ADMIN':
      dashboardRoute = '/admin/dashboard';
      break;
    case 'COLLABORATOR':
      dashboardRoute = '/collaborator/dashboard';
      break;
    case 'CLIENT':
      dashboardRoute = '/client/dashboard';
      break;
    // FREELANCER não está no enum UserRole, removido
    default:
      dashboardRoute = '/dashboard';
  }

  return {
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    },
    token,
    refreshToken,
    redirectTo: dashboardRoute
  };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
  avatarUrl: true,
  isVip: true,
      createdAt: true,
    },
  });
  if (!user) throw new Error("Usuário não encontrado");
  return user;
}

export type UpdateProfileInput = Prisma.UserUpdateInput;

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput,
  _file?: Express.Multer.File,
) {
  const updateData: Prisma.UserUpdateInput = { ...data };
  // avatarUrl deve vir do middleware do Cloudinary
  if (data.avatarUrl) {
    updateData.avatarUrl = data.avatarUrl;
  }
  
  // Se o campo 'password' vier como extra, gerar hash e atribuir
  const password = (data as any).password;
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
  avatarUrl: true,
  isVip: true,
        createdAt: true,
      },
    });
    return user;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === "P2002") {
      throw new Error("Email já está em uso.");
    }
    throw error;
  }
}

export async function listUsers() {
  return prisma.user.findMany({
  select: { id: true, name: true, email: true, role: true, createdAt: true, isVip: true },
  });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Usuário não encontrado");
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetTokenExpiry: expires,
    },
  });
  // Aqui você pode integrar com seu serviço de e-mail
  // await sendEmail(user.email, `Seu token de recuperação: ${token}`);
  return true;
}

export async function resetPassword(token: string, newPassword: string, ipAddress?: string) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetTokenExpiry: { gte: new Date() },
    },
  });
  if (!user) throw new Error("Token inválido ou expirado");
  
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
    },
  });
  
  // Enviar email de confirmação de alteração de senha
  try {
    await (await import('./emailService')).default.sendPasswordChangedEmail(
      user.email,
      user.name || 'Usuário',
      ipAddress
    );
  } catch (e) {
    logger.warn({obj:e}, 'Falha ao enviar email de confirmação:');
  }
  
  return true;
}

export async function getUserStats(userId: string) {
  try {
    const [bookingsCount, bookingsTotal, upcomingBookings, recentBookings] = await Promise.all([
      // Total de reservas do usuário
      prisma.booking.count({
        where: { clientId: userId }
      }),
      
      // Valor total das reservas
      prisma.booking.aggregate({
        where: { clientId: userId },
        _sum: { totalPrice: true }
      }),
      
      // Próximas reservas (próximos 30 dias)
      prisma.booking.count({
        where: {
          clientId: userId,
          eventDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Reservas recentes (últimos 30 dias)
      prisma.booking.count({
        where: {
          clientId: userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      totalBookings: bookingsCount,
      totalSpent: bookingsTotal._sum?.totalPrice || 0,
      upcomingBookings,
      recentBookings
    };
  } catch (error) {
    logger.error({obj:error}, 'Erro ao buscar estatísticas do usuário:');
    // Retornar valores padrão em caso de erro
    return {
      totalBookings: 0,
      totalSpent: 0,
      upcomingBookings: 0,
      recentBookings: 0
    };
  }
}

// Promove usuário para VIP de forma segura: valida total de reservas do cliente
export async function promoteToVip(userId: string) {
  // Verificar existência do usuário e perfil de cliente
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { clientProfile: true } });
  if (!user) throw new Error('Usuário não encontrado');

  // Se não tem clientProfile, não promovemos automaticamente
  if (!user.clientProfile) throw new Error('Perfil de cliente não encontrado');

  // Recalcular total de reservas para evitar confiar no cliente
  const totalBookings = await prisma.booking.count({ where: { clientId: user.clientProfile.id } });

  if (totalBookings < 5) {
    // Não promover se a regra de negócio não for satisfeita
    throw new Error('Regra de promoção para VIP não satisfeita');
  }

  // Atualizar campo isVip no usuário
  await prisma.user.update({ where: { id: userId }, data: { isVip: true } });

  return true;
}

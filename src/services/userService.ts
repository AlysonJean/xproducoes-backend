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
    select: { id: true, name: true, email: true, role: true, createdAt: true }
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
export async function requestPasswordReset(email: string) {
  // Segurança: não revelar se o usuário existe. Sempre retornar sucesso para
  // evitar enumeração de contas por e-mail.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Log opcional e retorno silencioso
    try {
      console.info(`requestPasswordReset called for non-existing email: ${email}`);
    } catch (e) {
      // noop
    }
    return { resetToken: null, email };
  }

  // Gerar token de reset
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await (await import('./emailService')).default.sendPasswordResetEmail(user.email, user.name || '', resetUrl);
  } catch (e) {
    console.warn('Falha ao enviar email de reset:', e);
  }

  return { resetToken, email: user.email };
}

export async function generateEmailVerificationToken(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await (prisma as any).user.update({ where: { id: userId }, data: { emailVerificationToken: token, emailVerificationTokenExpiry: expiry } });
  return token;
}

export async function verifyEmailByToken(token: string) {
  const user = await (prisma as any).user.findFirst({ where: { emailVerificationToken: token, emailVerificationTokenExpiry: { gte: new Date() } } });
  if (!user) throw new Error('Token inválido ou expirado');
  await (prisma as any).user.update({ where: { id: user.id }, data: { verified: true, emailVerificationToken: null, emailVerificationTokenExpiry: null } });
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
    console.warn('Falha ao enviar e-mail de verificação:', e);
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
import type { UserRole } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config as envConfig } from "../config/environment";

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
  return user;
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new Error("Usuário não encontrado");
  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new Error("Senha inválida");
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" },
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
      createdAt: true,
    },
  });
  if (!user) throw new Error("Usuário não encontrado");
  return user;
}

export type UpdateProfileInput = Partial<{
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  avatarUrl: string;
  role: UserRole;
  bio: string;
  location: string;
  website: string;
  socialLinks: any;
  verified: boolean;
  profileSettings: any;
}>;

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput,
  file?: Express.Multer.File,
) {
  const updateData: UpdateProfileInput = { ...data };
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
        createdAt: true,
      },
    });
    return user;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("Email já está em uso.");
    }
    throw error;
  }
}

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
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

export async function resetPassword(token: string, newPassword: string) {
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
    console.error('Erro ao buscar estatísticas do usuário:', error);
    // Retornar valores padrão em caso de erro
    return {
      totalBookings: 0,
      totalSpent: 0,
      upcomingBookings: 0,
      recentBookings: 0
    };
  }
}

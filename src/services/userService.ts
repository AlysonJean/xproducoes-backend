import { prisma } from "../config/prisma";
import type { UserRole, Prisma } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config as envConfig } from "../config/environment";
import logger from "../config/logger";
import { queueEmail } from "../config/jobQueue";

// Use centralized, cryptographically generated secret from environment config
const config = { jwtSecret: envConfig.jwtSecret };

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
  const updateData: Prisma.UserUpdateInput = { role };
  if (role === 'ADMIN') {
    // Quando promovido a ADMIN, marcar como verificado e limpar tokens pendentes
    updateData.verified = true;
    updateData.emailVerificationToken = null;
    updateData.emailVerificationTokenExpiry = null;
  }
  return prisma.user.update({
    where: { id: String(id) },
    data: updateData
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
    // Return success to prevent user enumeration
    return { success: true };
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

  // Enviar email com link seguro para reset (via fila - não bloqueia o fluxo)
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    await queueEmail({
      type: 'password-reset',
      to: user.email,
      templateData: {
        name: user.name || 'Usuário',
        resetUrl,
        ipAddress,
        userAgent,
      },
    });
  } catch (e) {
    logger.warn({obj:e}, 'Falha ao enfileirar email de reset:');
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
  // ADMINs não precisam concluir verificação
  if (user.role === 'ADMIN') return { success: true };
  if (user.verified) throw new Error('E-mail já verificado');
  const token = await generateEmailVerificationToken(userId);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
  
  try {
    await queueEmail({
      type: 'verification',
      to: user.email,
      templateData: { verifyUrl },
    });
  } catch (e) {
    logger.warn({obj:e}, 'Falha ao enfileirar e-mail de verificação:');
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

export type RegisterInput = { name: string; email: string; password: string; role?: string };
export type LoginInput = { email: string; password: string };

export async function register(data: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new Error("Email já está em uso.");
  const hash = await bcrypt.hash(data.password, 10);
  const role = (data.role as any) || "CLIENT";
  const user = await prisma.user.create({
    data: { 
      name: data.name, 
      email: data.email, 
      passwordHash: hash,
      role,
      // Marcar admins como verificados automaticamente
      verified: role === 'ADMIN' ? true : undefined,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  // Cria perfil de cliente por padrão (não bloqueante) — evita criar para ADMIN
  try {
    if (role !== 'ADMIN') {
      await prisma.client.create({ data: { userId: user.id } });
    }
  } catch (e) {
    logger.warn({obj:e}, 'Falha ao criar perfil de cliente (não bloqueante):');
  }
  // Envia e-mail de verificação (não bloqueante) — não envia para ADMIN
  if (role !== 'ADMIN') {
    try {
      const token = await generateEmailVerificationToken(user.id);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
      await (await import('./emailService')).default.sendVerificationEmail(user.email, verifyUrl);
    } catch (e) {
      logger.warn({obj:e}, 'Falha ao enviar e-mail de verificação (não bloqueante):');
    }
  }
  return { ...user, needsEmailVerification: role !== 'ADMIN' } as const;
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new Error("Credenciais inválidas");
  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new Error("Credenciais inválidas");
  // Exigir verificação de e-mail se habilitado por ambiente; ADMINs são dispensados
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.verified && user.role !== 'ADMIN') {
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
    { expiresIn: "3d" }, // Refresh token com 3 dias
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
      googleCalendarEmail: true,
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

  // Campos relacionados a perfis (Client/Collaborator) não pertencem ao modelo `User`.
  // Extrair `phone` e atualizá-lo no perfil relacionado, removendo-o do payload do `User`.
  const phone = (data as any).phone;
  if (phone !== undefined) {
    // Remover do payload do User para evitar erro de validação do Prisma
    delete (updateData as any).phone;

    const [client, collaborator] = await Promise.all([
      prisma.client.findUnique({ where: { userId } }),
      prisma.collaborator.findUnique({ where: { userId } }),
    ]);

    if (client) {
      await prisma.client.update({ where: { userId }, data: { phone } });
    } else if (collaborator) {
      await prisma.collaborator.update({ where: { userId }, data: { phone } });
    } else {
      // Se não existir perfil, cria o mais apropriado baseado no role do usuário
      const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (currentUser && currentUser.role === 'COLLABORATOR') {
        await prisma.collaborator.create({ data: { userId, phone } });
      } else {
        await prisma.client.create({ data: { userId, phone } });
      }
    }
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
  if (!user) throw new Error("Credenciais inválidas");
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetTokenExpiry: expires,
    },
  });
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
    // Buscar o perfil de cliente vinculado ao usuário
    const client = await prisma.client.findUnique({
      where: { userId }
    });

    if (!client) {
      return {
        totalBookings: 0,
        totalSpent: 0,
        upcomingBookings: 0,
        recentBookings: 0
      };
    }

    const [bookingsCount, bookingsTotal, upcomingBookings, recentBookings] = await Promise.all([
      // Total de reservas do usuário
      prisma.booking.count({
        where: { clientId: client.id }
      }),
      
      // Valor total das reservas
      prisma.booking.aggregate({
        where: { clientId: client.id },
        _sum: { totalPrice: true }
      }),
      
      // Próximas reservas (próximos 30 dias)
      prisma.booking.count({
        where: {
          clientId: client.id,
          eventDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Reservas recentes (últimos 30 dias)
      prisma.booking.count({
        where: {
          clientId: client.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      totalBookings: bookingsCount,
      totalSpent: Number(bookingsTotal._sum?.totalPrice || 0),
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

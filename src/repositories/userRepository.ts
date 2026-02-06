/**
 * 📦 USER REPOSITORY
 * Camada de acesso a dados para usuários
 */

import { prisma } from '../config/prisma';
import { Prisma, UserRole } from '@prisma/client';

// Tipos
export interface UserFilters {
  search?: string;
  role?: UserRole;
  verified?: boolean;
  isVip?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Seleção padrão (sem dados sensíveis)
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  isVip: true,
  verified: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Seleção completa (para perfil próprio)
const userSelectFull = {
  ...userSelect,
  bio: true,
  location: true,
  googleId: true,
  facebookId: true,
} as const;

/**
 * Buscar usuário por ID
 */
export async function findById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
}

/**
 * Buscar usuário por ID com dados completos (perfil próprio)
 */
export async function findByIdFull(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userSelectFull,
  });
}

/**
 * Buscar usuário por email
 */
export async function findByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Listar usuários com filtros e paginação
 */
export async function findMany(
  filters: UserFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 20 }
) {
  const { search, role, verified, isVip } = filters;
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (verified !== undefined) {
    where.verified = verified;
  }

  if (isVip !== undefined) {
    where.isVip = isVip;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Listar clientes
 */
export async function findAllClients() {
  return prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Criar usuário
 */
export async function create(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  phone?: string;
}) {
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role || 'CLIENT',
    },
    select: userSelect,
  });
}

/**
 * Atualizar usuário
 */
export async function update(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });
}

/**
 * Deletar usuário
 */
export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
  });
}

/**
 * Contar total de usuários
 */
export async function count(where?: Prisma.UserWhereInput) {
  return prisma.user.count({ where });
}

/**
 * Verificar se email existe
 */
export async function emailExists(email: string, excludeId?: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) return false;
  if (excludeId && user.id === excludeId) return false;

  return true;
}

/**
 * Buscar por token de reset de senha
 */
export async function findByPasswordResetToken(token: string) {
  return prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetTokenExpiry: { gte: new Date() },
    },
  });
}

/**
 * Buscar por token de verificação de email
 */
export async function findByEmailVerificationToken(token: string) {
  return prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationTokenExpiry: { gte: new Date() },
    },
  });
}

export default {
  findById,
  findByIdFull,
  findByEmail,
  findMany,
  findAllClients,
  create,
  update,
  delete: deleteUser,
  count,
  emailExists,
  findByPasswordResetToken,
  findByEmailVerificationToken,
};

/**
 * 📦 BOOKING REPOSITORY
 * Camada de acesso a dados para reservas
 */

import { prisma } from '../config/prisma';
import { Prisma, BookingStatus } from '@prisma/client';

// Tipos
export interface BookingFilters {
  clientId?: string;
  creatorId?: string;
  status?: BookingStatus;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Includes padrão para listagem
const bookingInclude = {
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  client: {
    select: {
      id: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  equipments: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
      pricePerHour: true,
    },
  },
  kit: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
      price: true,
    },
  },
} as const;

/**
 * Buscar reserva por ID
 */
export async function findById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
}

/**
 * Listar reservas com filtros e paginação
 */
export async function findMany(
  filters: BookingFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 20 }
) {
  const { clientId, creatorId, status, startDate, endDate, search } = filters;
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.BookingWhereInput = {};

  if (clientId) {
    where.clientId = clientId;
  }

  if (creatorId) {
    where.creatorId = creatorId;
  }

  if (status) {
    where.status = status;
  }

  if (startDate) {
    where.eventDate = { gte: startDate };
  }

  if (endDate) {
    where.eventEndDate = { lte: endDate };
  }

  if (search) {
    where.OR = [
      { eventTitle: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
      { clientEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    data: bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Criar nova reserva
 */
export async function create(data: Prisma.BookingCreateInput) {
  return prisma.booking.create({
    data,
    include: bookingInclude,
  });
}

/**
 * Atualizar reserva
 */
export async function update(id: string, data: Prisma.BookingUpdateInput) {
  return prisma.booking.update({
    where: { id },
    data,
    include: bookingInclude,
  });
}

/**
 * Atualizar status da reserva
 */
export async function updateStatus(id: string, status: BookingStatus) {
  return prisma.booking.update({
    where: { id },
    data: { status },
    include: bookingInclude,
  });
}

/**
 * Deletar reserva
 */
export async function remove(id: string) {
  return prisma.booking.delete({
    where: { id },
  });
}

/**
 * Buscar reservas por período (para verificar disponibilidade)
 */
export async function findByDateRange(startDate: Date, endDate: Date) {
  return prisma.booking.findMany({
    where: {
      status: { notIn: ['CANCELLED'] },
      OR: [
        {
          eventDate: { lte: endDate },
          eventEndDate: { gte: startDate },
        },
      ],
    },
    include: {
      equipments: {
        select: {
          id: true,
          quantity: true,
        },
      },
    },
  });
}

/**
 * Contar reservas por status
 */
export async function countByStatus(creatorId?: string) {
  const where: Prisma.BookingWhereInput = creatorId ? { creatorId } : {};
  
  const counts = await prisma.booking.groupBy({
    by: ['status'],
    where,
    _count: { status: true },
  });

  return counts.reduce((acc, { status, _count }) => {
    acc[status] = _count.status;
    return acc;
  }, {} as Record<BookingStatus, number>);
}

/**
 * Buscar reservas do cliente
 */
export async function findByClientId(
  clientId: string,
  pagination: PaginationOptions = { page: 1, limit: 20 }
) {
  return findMany({ clientId }, pagination);
}

/**
 * Buscar reservas por criador
 */
export async function findByCreatorId(
  creatorId: string,
  pagination: PaginationOptions = { page: 1, limit: 20 }
) {
  return findMany({ creatorId }, pagination);
}

export const bookingRepository = {
  findById,
  findMany,
  create,
  update,
  updateStatus,
  remove,
  findByDateRange,
  countByStatus,
  findByClientId,
  findByCreatorId,
};

export default bookingRepository;

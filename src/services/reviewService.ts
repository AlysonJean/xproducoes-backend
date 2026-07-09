import { prisma } from "../config/prisma";
import type { Prisma } from "@prisma/client";

// Interfaces para filtros e dados
interface ReviewFilters {
  rating?: number | string;
  equipmentId?: string;
}

interface ReviewUpdateData {
  rating?: number;
  comment?: string;
  reported?: boolean;
}

export async function findPublicReviews(limit = 20, skip = 0) {
  return prisma.review.findMany({
    where: { reported: false },
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: { select: { name: true, avatarUrl: true } },
      collaborator: {
        select: { id: true, user: { select: { name: true, avatarUrl: true } } },
      },
    },
    take: Math.min(limit, 100),
    skip,
  });
}

export async function create(data: {
  rating: number;
  comment?: string;
  photos?: string[];
  tags?: string[];
  punctuality?: number;
  professionalism?: number;
  quality?: number;
  communication?: number;
  valueForMoney?: number;
  bookingId: string;
  reviewerId: string;
  // collaboratorId intencionalmente não suportado para reviews de serviço do cliente
}) {
  // 1) Verificar se o booking existe e está concluído
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: { client: { select: { userId: true } } },
  });

  if (!booking) {
    throw Object.assign(new Error("Reserva não encontrada"), { status: 404 });
  }

  if (booking.status !== "COMPLETED") {
    throw Object.assign(new Error("Só é possível avaliar serviços de reservas concluídas"), { status: 400 });
  }

  // 2) Verificar se o utilizador é o cliente dono da reserva
  const bookingClientUserId = booking.client?.userId;
  if (!bookingClientUserId || bookingClientUserId !== data.reviewerId) {
    throw Object.assign(new Error("Apenas o cliente desta reserva pode deixar uma avaliação"), { status: 403 });
  }

  // 3) Garantir apenas uma avaliação por reserva (único por schema)
  const existing = await prisma.review.findUnique({ where: { bookingId: data.bookingId } });
  if (existing) {
    throw Object.assign(new Error("Esta reserva já possui uma avaliação"), { status: 409 });
  }

  // 4) Criar avaliação (sem collaboratorId)
  return prisma.review.create({
    data: {
      rating: data.rating,
      comment: data.comment,
      photos: data.photos ?? [],
      tags: data.tags ?? [],
      punctuality: data.punctuality,
      professionalism: data.professionalism,
      quality: data.quality,
      communication: data.communication,
      valueForMoney: data.valueForMoney,
      bookingId: data.bookingId,
      reviewerId: data.reviewerId,
    },
    include: {
      reviewer: { select: { name: true, avatarUrl: true } },
      booking: {
        include: {
          equipments: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function findAll(filters?: ReviewFilters, limit = 20, skip = 0) {
  const where: Prisma.ReviewWhereInput = {};
  
  if (filters?.rating) {
    where.rating = { gte: Number(filters.rating) };
  }
  
  if (filters?.equipmentId) {
    where.booking = {
      equipments: {
        some: {
          id: filters.equipmentId,
        },
      },
    };
  }

  return prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: { select: { name: true, avatarUrl: true } },
      collaborator: {
        select: { id: true, user: { select: { name: true, avatarUrl: true } } },
      },
      booking: {
        include: {
          equipments: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    take: Math.min(limit, 100),
    skip,
  });
}

export async function findByEquipment(equipmentId: string, limit = 10, skip = 0) {
  return prisma.review.findMany({
    where: {
      booking: {
        equipments: {
          some: {
            id: equipmentId,
          },
        },
      },
      reported: false,
    },
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: { select: { name: true, avatarUrl: true } },
      booking: {
        select: {
          eventDate: true,
        },
      },
    },
    take: Math.min(limit, 50),
    skip,
  });
}

export async function findByUser(userId: string, limit = 20, skip = 0) {
  return prisma.review.findMany({
    where: { reviewerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      booking: {
        include: {
          equipments: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      collaborator: {
        select: { id: true, user: { select: { name: true } } },
      },
    },
    take: Math.min(limit, 100),
    skip,
  });
}

export async function update(id: string, data: ReviewUpdateData) {
  return prisma.review.update({
    where: { id },
    data,
    include: {
      reviewer: { select: { name: true, avatarUrl: true } },
      booking: {
        include: {
          equipments: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function deleteReview(id: string) {
  return prisma.review.delete({ where: { id } });
}

// Alias para compatibilidade
export const delete_ = deleteReview;

export async function approve(id: string) {
  // Como não há campo approved, vamos marcar como não reportado
  return prisma.review.update({
    where: { id },
    data: { reported: false },
    include: {
      reviewer: { select: { name: true, avatarUrl: true } },
      booking: {
        include: {
          equipments: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function reject(id: string) {
  // Como não há campo approved, vamos marcar como reportado para "rejeitar"
  return prisma.review.update({
    where: { id },
    data: { reported: true },
    include: {
      reviewer: { select: { name: true, avatarUrl: true } },
      booking: {
        include: {
          equipments: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function getStats() {
  const totalReviews = await prisma.review.count();
  const avgRating = await prisma.review.aggregate({
    _avg: {
      rating: true,
    },
  });
  
  const ratingDistribution = await prisma.review.groupBy({
    by: ['rating'],
    _count: {
      rating: true,
    },
  });

  const recentReviews = await prisma.review.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // últimos 30 dias
      },
    },
  });

  return {
    total: totalReviews,
    averageRating: avgRating._avg.rating || 0,
    distribution: ratingDistribution,
    recentCount: recentReviews,
  };
}

export async function getRecent(limit: number = 5) {
  return prisma.review.findMany({
    where: { 
      reported: false,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      reviewer: { select: { name: true, avatarUrl: true } },
      booking: {
        include: {
          equipments: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

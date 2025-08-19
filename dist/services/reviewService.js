"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete_ = void 0;
exports.findPublicReviews = findPublicReviews;
exports.create = create;
exports.findAll = findAll;
exports.findByEquipment = findByEquipment;
exports.findByUser = findByUser;
exports.update = update;
exports.deleteReview = deleteReview;
exports.approve = approve;
exports.reject = reject;
exports.getStats = getStats;
exports.getRecent = getRecent;
const prisma_1 = require("../config/prisma");
async function findPublicReviews() {
    return prisma_1.prisma.review.findMany({
        where: { reported: false },
        orderBy: { createdAt: "desc" },
        include: {
            reviewer: { select: { name: true, avatarUrl: true } },
            collaborator: {
                select: { id: true, user: { select: { name: true, avatarUrl: true } } },
            },
        },
    });
}
async function create(data) {
    // 1) Verificar se o booking existe e está concluído
    const booking = await prisma_1.prisma.booking.findUnique({
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
    const existing = await prisma_1.prisma.review.findUnique({ where: { bookingId: data.bookingId } });
    if (existing) {
        throw Object.assign(new Error("Esta reserva já possui uma avaliação"), { status: 409 });
    }
    // 4) Criar avaliação (sem collaboratorId)
    return prisma_1.prisma.review.create({
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
async function findAll(filters) {
    const where = {};
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
    return prisma_1.prisma.review.findMany({
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
    });
}
async function findByEquipment(equipmentId) {
    return prisma_1.prisma.review.findMany({
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
    });
}
async function findByUser(userId) {
    return prisma_1.prisma.review.findMany({
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
    });
}
async function update(id, data) {
    return prisma_1.prisma.review.update({
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
async function deleteReview(id) {
    return prisma_1.prisma.review.delete({ where: { id } });
}
// Alias para compatibilidade
exports.delete_ = deleteReview;
async function approve(id) {
    // Como não há campo approved, vamos marcar como não reportado
    return prisma_1.prisma.review.update({
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
async function reject(id) {
    // Como não há campo approved, vamos marcar como reportado para "rejeitar"
    return prisma_1.prisma.review.update({
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
async function getStats() {
    const totalReviews = await prisma_1.prisma.review.count();
    const avgRating = await prisma_1.prisma.review.aggregate({
        _avg: {
            rating: true,
        },
    });
    const ratingDistribution = await prisma_1.prisma.review.groupBy({
        by: ['rating'],
        _count: {
            rating: true,
        },
    });
    const recentReviews = await prisma_1.prisma.review.count({
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
async function getRecent(limit = 5) {
    return prisma_1.prisma.review.findMany({
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

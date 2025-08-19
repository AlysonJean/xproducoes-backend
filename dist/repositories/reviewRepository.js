"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewRepository = void 0;
// OBSOLETO: Centralizado no Prisma Client
const prisma_1 = require("../config/prisma");
class ReviewRepository {
    async findByBookingId(bookingId) {
        return prisma_1.prisma.review.findUnique({ where: { bookingId } });
    }
    async create(data) {
        return prisma_1.prisma.review.create({ data });
    }
    async findPublic() {
        return prisma_1.prisma.review.findMany({
            take: 6,
            where: { rating: { gte: 4 } },
            orderBy: { createdAt: "desc" },
            include: { reviewer: { select: { name: true } } },
        });
    }
}
exports.ReviewRepository = ReviewRepository;

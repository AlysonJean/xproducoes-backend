// OBSOLETO: Centralizado no Prisma Client
import { prisma } from "../config/prisma";

export class ReviewRepository {
  async findByBookingId(bookingId: string) {
    return prisma.review.findUnique({ where: { bookingId } });
  }

  async create(data: any) {
    return prisma.review.create({ data });
  }

  async findPublic() {
    return prisma.review.findMany({
      take: 6,
      where: { rating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      include: { reviewer: { select: { name: true } } },
    });
  }
}

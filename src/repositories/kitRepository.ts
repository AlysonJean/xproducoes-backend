// OBSOLETO: Centralizado no Prisma Client
import { prisma } from "../config/prisma";

export class KitRepository {
  async create(data: any) {
    return prisma.kit.create({ data });
  }
  async findAll(limit?: number) {
    return prisma.kit.findMany({ 
      include: { 
        items: {
          include: {
            equipment: true,
            service: true
          }
        } 
      },
      ...(limit ? { take: limit } : {})
    });
  }
  async findOne(idOrSlug: string) {
    const kit = await prisma.kit.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ]
      },
      include: { 
        items: {
          include: {
            equipment: true,
            service: true
          }
        }
      },
    });

    if (!kit) return null;

    // Fetch neighbors (Previous and Next by name)
    const [prev, next] = await Promise.all([
      prisma.kit.findFirst({
        where: {
          name: { lt: kit.name },
          isAvailable: true
        },
        orderBy: { name: 'desc' },
        select: { slug: true }
      }),
      prisma.kit.findFirst({
        where: {
          name: { gt: kit.name },
          isAvailable: true
        },
        orderBy: { name: 'asc' },
        select: { slug: true }
      })
    ]);

    return {
      ...kit,
      prevSlug: prev?.slug || null,
      nextSlug: next?.slug || null
    };
  }
  async update(id: string, data: any) {
    return prisma.kit.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.kit.delete({ where: { id } });
  }

  async findRecommended() {
    // Retorna kits com maior quantidade de items
    return prisma.kit.findMany({
      include: { 
        items: {
          include: {
            equipment: true,
            service: true
          }
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        items: {
          _count: 'desc',
        },
      },
      take: 6,
    });
  }

  async findPopular() {
    // Retorna kits mais utilizados em bookings
    return prisma.kit.findMany({
      include: { 
        items: {
          include: {
            equipment: true
          }
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: [
        {
          bookings: {
            _count: 'desc',
          },
        },
        {
          createdAt: 'desc',
        },
      ],
      take: 6,
    });
  }
}

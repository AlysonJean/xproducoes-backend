// OBSOLETO: Centralizado no Prisma Client
import { prisma } from "../config/prisma";

export class KitRepository {
  async create(data: any) {
    return prisma.kit.create({ data });
  }
  async findAll() {
    return prisma.kit.findMany({ include: { equipments: true } });
  }
  async findOne(id: string) {
    return prisma.kit.findUnique({
      where: { id },
      include: { equipments: true },
    });
  }
  async update(id: string, data: any) {
    return prisma.kit.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.kit.delete({ where: { id } });
  }

  async findRecommended() {
    // Retorna kits com maior quantidade de equipamentos
    return prisma.kit.findMany({
      include: { 
        equipments: true,
        _count: {
          select: {
            equipments: true,
          },
        },
      },
      orderBy: {
        equipments: {
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
        equipments: true,
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

import { prisma } from "../config/prisma";

export class CategoryRepository {
  async create(
    data: { name: string; slug: string }
  ): Promise<{ id: string; name: string; slug: string }> {
    return prisma.category.create({ data });
  }

  async update(
    id: string,
    data: { name: string }
  ): Promise<{ id: string; name: string; slug: string }> {
    return prisma.category.update({
      where: { id },
      data,
    });
  }

  async findAll(): Promise<Array<{ id: string; name: string; slug: string }>> {
    return prisma.category.findMany();
  }

  async delete(
    id: string
  ): Promise<{ id: string; name: string; slug: string }> {
    return prisma.category.delete({ where: { id } });
  }

  async countEquipments(
    id: string
  ): Promise<number> {
    return prisma.equipment.count({ where: { categoryId: id } });
  }

  async findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        equipments: true,
      },
    });
  }

  async findAllWithEquipmentCount() {
    return prisma.category.findMany({
      include: {
        _count: {
          select: {
            equipments: true,
          },
        },
      },
    });
  }

  async findFeatured() {
    // Para agora, retornamos as primeiras 6 categorias que têm equipamentos
    return prisma.category.findMany({
      where: {
        equipments: {
          some: {},
        },
      },
      include: {
        _count: {
          select: {
            equipments: true,
          },
        },
      },
      take: 6,
      orderBy: {
        equipments: {
          _count: 'desc',
        },
      },
    });
  }
}

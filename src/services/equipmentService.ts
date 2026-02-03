import { prisma } from "../config/prisma";
import type { Equipment, Prisma } from "@prisma/client";

interface EquipmentSearchQuery {
  name?: string;
  categoryId?: string;
}

export class EquipmentService {
  async create(data: Prisma.EquipmentCreateInput, _file?: Express.Multer.File): Promise<Equipment> {
    // imageUrl deve vir do middleware do Cloudinary
    const imageUrl = data.imageUrl || "";
    const equipmentData = { ...data } as any;
    delete equipmentData.fileName;
    
    return prisma.equipment.create({
      data: {
        ...equipmentData,
        pricePerHour: Number(data.pricePerHour),
        quantity: Number(data.quantity),
        imageUrl,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.EquipmentUpdateInput,
    _file?: Express.Multer.File,
  ): Promise<Equipment | null> {
    // imageUrl deve vir do middleware do Cloudinary (se fornecido)
    const imageUrl = data.imageUrl;
    const equipmentData = { ...data } as any;
    delete equipmentData.fileName;
    
    return prisma.equipment.update({
      where: { id },
      data: {
        ...equipmentData,
        ...(imageUrl && { imageUrl }),
      },
    });
  }

  async findAll(limit?: number): Promise<Equipment[]> {
    return prisma.equipment.findMany({
      ...(limit ? { take: limit } : {}),
      orderBy: { name: 'asc' } // Boa prática: garantir ordem consistente
    });
  }

  async findOne(id: string): Promise<Equipment | null> {
    return prisma.equipment.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await prisma.equipment.delete({ where: { id } });
  }

  async search(query: EquipmentSearchQuery): Promise<Equipment[]> {
    // Exemplo simples de busca por nome/categoria
    const { name, categoryId } = query;
    return prisma.equipment.findMany({
      where: {
        ...(name && { name: { contains: name, mode: "insensitive" as const } }),
        ...(categoryId && { categoryId }),
      },
    });
  }

  async getAvailability(id: string, month: number, year: number) {
    // Implemente a lógica de disponibilidade conforme seu domínio
    return { available: true, month, year };
  }

  async findByCategory(categoryId: string): Promise<Equipment[]> {
    return prisma.equipment.findMany({
      where: { categoryId },
      include: {
        category: true,
      },
    });
  }

  async getTotalEquipments(): Promise<number> {
    return prisma.equipment.count();
  }
}

import { prisma } from "../config/prisma";
import type { Equipment } from "@prisma/client";

export class EquipmentService {
  async create(data: any, _file?: Express.Multer.File): Promise<Equipment> {
    // imageUrl deve vir do middleware do Cloudinary
    const imageUrl = data.imageUrl || "";
    
    return prisma.equipment.create({
      data: {
        ...data,
        pricePerHour: Number(data.pricePerHour),
        quantity: Number(data.quantity),
        imageUrl,
      },
    });
  }

  async update(
    id: string,
    data: any,
    _file?: Express.Multer.File,
  ): Promise<Equipment | null> {
    // imageUrl deve vir do middleware do Cloudinary (se fornecido)
    const imageUrl = data.imageUrl;
    
    return prisma.equipment.update({
      where: { id },
      data: {
        ...data,
        ...(imageUrl && { imageUrl }),
      },
    });
  }

  async findAll(): Promise<Equipment[]> {
    return prisma.equipment.findMany();
  }

  async findOne(id: string): Promise<Equipment | null> {
    return prisma.equipment.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await prisma.equipment.delete({ where: { id } });
  }

  async search(query: any): Promise<Equipment[]> {
    // Exemplo simples de busca por nome/categoria
    const { name, categoryId } = query;
    return prisma.equipment.findMany({
      where: {
        ...(name && { name: { contains: name, mode: "insensitive" } }),
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

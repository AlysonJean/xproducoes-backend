import { prisma } from "../config/prisma";
import type { Equipment, Prisma } from "@prisma/client";
import { generateSlug } from "../utils/slug";
import { randomBytes } from "crypto";

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
    
    // Gerar slug a partir do nome
    let slug = generateSlug(equipmentData.name);
    
    // Verificar se slug existe e adicionar sufixo se necessário
    const slugExists = await prisma.equipment.findUnique({ where: { slug } });
    if (slugExists) {
        slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    return prisma.equipment.create({
      data: {
        ...equipmentData,
        pricePerHour: Number(data.pricePerHour),
        quantity: Number(data.quantity),
        imageUrl,
        slug,
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
      include: { category: true }
    });
  }

  async findAll(limit?: number): Promise<Equipment[]> {
    return prisma.equipment.findMany({
      ...(limit ? { take: limit } : {}),
      orderBy: { name: 'asc' },
      include: { category: true }
    });
  }

  async findOne(idOrSlug: string): Promise<Equipment | null> {
    return prisma.equipment.findFirst({ 
      where: { 
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ]
      },
      include: { category: true }
    });
  }

  async delete(id: string): Promise<void> {
    // Verificar se existem reservas associadas
    const bookingsCount = await prisma.booking.count({
      where: {
        equipments: {
          some: { id }
        }
      }
    });

    if (bookingsCount > 0) {
      throw new Error(`Este equipamento possui ${bookingsCount} reservas registradas e não pode ser excluído. Considere torná-lo 'IsAvailable = false' para mantê-lo no histórico.`);
    }

    // Se estiver em Kits, o relacionamento será removido automaticamente (Cascade em tabela pivot implícita)
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
      include: { category: true }
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

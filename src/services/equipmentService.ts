import { prisma } from "../config/prisma";
import { ItemStatus, Prisma, type Equipment } from "@prisma/client";
import { generateSlug } from "../utils/slug";
import { randomBytes } from "crypto";
import { BadRequestError, NotFoundError } from "../utils/errors";

const toNullableJsonInput = (value: Prisma.JsonValue): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue => {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
};

type EquipmentCreateData = {
  name: string;
  description: string;
  pricePerHour: number;
  quantity: number;
  categoryId: string;
  imageUrl?: string;
};

type EquipmentUpdateData = Partial<EquipmentCreateData>;

interface EquipmentSearchQuery {
  name?: string;
  categoryId?: string;
  status?: string;
}

export class EquipmentService {
  async create(data: EquipmentCreateData, _file?: Express.Multer.File): Promise<Equipment> {
    const imageUrl = data.imageUrl || "";

    // Gerar slug a partir do nome
    let slug = generateSlug(data.name);
    
    // Verificar se slug existe e adicionar sufixo se necessário
    const slugExists = await prisma.equipment.findUnique({ where: { slug } });
    if (slugExists) {
        slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    return prisma.equipment.create({
      data: {
        name: data.name,
        description: data.description,
        pricePerHour: Number(data.pricePerHour),
        quantity: Number(data.quantity),
        imageUrl,
        slug,
        category: {
          connect: { id: data.categoryId },
        },
      },
    });
  }

  async update(
    id: string,
    data: EquipmentUpdateData,
    _file?: Express.Multer.File,
  ): Promise<Equipment | null> {
    const imageUrl = data.imageUrl;
    const updateData: Prisma.EquipmentUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.pricePerHour !== undefined) updateData.pricePerHour = Number(data.pricePerHour);
    if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
    if (data.categoryId !== undefined) {
      updateData.category = {
        connect: { id: data.categoryId },
      };
    }
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    
    return prisma.equipment.update({
      where: { id },
      data: updateData,
      include: { category: true }
    });
  }

  async findAll(limit?: number, publicView = true): Promise<Equipment[]> {
    return prisma.equipment.findMany({
      where: {
        ...(publicView ? { status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] } } : {})
      },
      ...(limit ? { take: limit } : {}),
      orderBy: { name: 'asc' },
      include: { category: true }
    });
  }

  async findOne(idOrSlug: string): Promise<Equipment & { prevSlug?: string | null; nextSlug?: string | null } | null> {
    const equipment = await prisma.equipment.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ]
      },
      include: { category: true }
    });

    if (!equipment) return null;

    // Fetch neighbors (Previous and Next by name in the same category)
    const [prev, next] = await Promise.all([
      prisma.equipment.findFirst({
        where: {
          categoryId: equipment.categoryId,
          name: { lt: equipment.name },
          status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] }
        },
        orderBy: { name: 'desc' },
        select: { slug: true }
      }),
      prisma.equipment.findFirst({
        where: {
          categoryId: equipment.categoryId,
          name: { gt: equipment.name },
          status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] }
        },
        orderBy: { name: 'asc' },
        select: { slug: true }
      })
    ]);

    return {
      ...equipment,
      prevSlug: prev?.slug || null,
      nextSlug: next?.slug || null
    };
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
      throw new BadRequestError(`Este equipamento possui ${bookingsCount} reservas registradas e não pode ser excluído. Considere torná-lo inativo para mantê-lo no histórico.`);
    }

    // Get equipment to retrieve image URL before deletion
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { imageUrl: true }
    });

    // Delete from Cloudinary if has image
    if (equipment?.imageUrl) {
      const { UploadService } = await import('./uploadService');
      const uploadService = new UploadService();
      await uploadService.deleteFile(equipment.imageUrl);
    }

    // Se estiver em Kits, o relacionamento será removido automaticamente (Cascade em tabela pivot implícita)
    await prisma.equipment.delete({ where: { id } });
  }

  async search(query: EquipmentSearchQuery): Promise<Equipment[]> {
    // Exemplo simples de busca por nome/categoria/status
    const { name, categoryId, status } = query;
    return prisma.equipment.findMany({
      where: {
        ...(name && { name: { contains: name, mode: "insensitive" as const } }),
        ...(categoryId && { categoryId }),
        ...(status && { status: status as ItemStatus }),
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

  async duplicate(id: string): Promise<Equipment> {
    // Get original equipment
    const original = await prisma.equipment.findUnique({
      where: { id },
      include: { category: true }
    });

    if (!original) {
      throw new NotFoundError('Equipamento não encontrado');
    }

    // Create copy with modified name
    const copyName = `${original.name} (Cópia)`;
    let slug = generateSlug(copyName);

    // Ensure unique slug
    const slugExists = await prisma.equipment.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    // Create duplicate (excluding id, createdAt, updatedAt, slug)
    const duplicateData: Prisma.EquipmentUncheckedCreateInput = {
      name: copyName,
      description: original.description,
      imageUrl: original.imageUrl,
      slug,
      pricePerHour: original.pricePerHour,
      quantity: original.quantity,
      status: original.status,
      tags: original.tags,
      specifications: toNullableJsonInput(original.specifications),
      weight: original.weight,
      dimensions: toNullableJsonInput(original.dimensions),
      powerRequirements: original.powerRequirements,
      maintenanceNotes: original.maintenanceNotes,
      condition: original.condition,
      location: original.location,
      minimumRentalDuration: original.minimumRentalDuration,
      replacementCost: original.replacementCost,
      categoryId: original.categoryId
    };

    return prisma.equipment.create({
      data: duplicateData,
      include: { category: true }
    });
  }
}

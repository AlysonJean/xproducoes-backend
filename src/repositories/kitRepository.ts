import { prisma } from "../config/prisma";
import type { Prisma } from "@prisma/client";

export class KitRepository {
  async create(data: Prisma.KitCreateInput) {
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
        },
        experienceLevels: {
          orderBy: { level: 'asc' }
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
        },
        experienceLevels: {
          orderBy: { level: 'asc' }
        }
      },
    });

    if (!kit) return null;

    // Fetch neighbors (Previous and Next by name)
    const [prev, next] = await Promise.all([
      prisma.kit.findFirst({
        where: {
          name: { lt: kit.name },
          status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] }
        },
        orderBy: { name: 'desc' },
        select: { slug: true }
      }),
      prisma.kit.findFirst({
        where: {
          name: { gt: kit.name },
          status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] }
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
  async update(id: string, data: Prisma.KitUpdateInput) {
    return prisma.kit.update({ where: { id }, data });
  }
  async delete(id: string) {
    // Get kit to retrieve image URLs before deletion
    const kit = await prisma.kit.findUnique({
      where: { id },
      select: { imageUrl: true, coverImage: true }
    });

    // Delete images from Cloudinary if they exist — mas só se nenhum outro kit ainda aponta
    // para a mesma imagem. duplicate() copia imageUrl/coverImage por referência (mesmo
    // public_id no Cloudinary) em vez de subir uma cópia própria; sem essa checagem, excluir
    // um dos dois apaga o arquivo do Cloudinary por baixo do outro.
    if (kit) {
      const { UploadService } = await import('../services/uploadService');
      const uploadService = new UploadService();

      if (kit.imageUrl) {
        const stillReferenced = await prisma.kit.count({
          where: {
            id: { not: id },
            OR: [{ imageUrl: kit.imageUrl }, { coverImage: kit.imageUrl }]
          }
        });
        if (stillReferenced === 0) {
          await uploadService.deleteFile(kit.imageUrl);
        }
      }
      if (kit.coverImage && kit.coverImage !== kit.imageUrl) {
        const stillReferenced = await prisma.kit.count({
          where: {
            id: { not: id },
            OR: [{ imageUrl: kit.coverImage }, { coverImage: kit.coverImage }]
          }
        });
        if (stillReferenced === 0) {
          await uploadService.deleteFile(kit.coverImage);
        }
      }
    }

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
        experienceLevels: {
          orderBy: { level: 'asc' }
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
        experienceLevels: {
          orderBy: { level: 'asc' }
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

  async duplicate(id: string) {
    // Get original kit with relations
    const original = await prisma.kit.findUnique({
      where: { id },
      include: { items: true, experienceLevels: true }
    });

    if (!original) {
      throw new Error('Kit not found');
    }

    // Create copy with modified name
    const copyName = `${original.name} (Cópia)`;
    const { generateSlug } = await import('../utils/slug');
    const { randomBytes } = await import('crypto');
    let slug = generateSlug(copyName);

    // Ensure unique slug
    const slugExists = await prisma.kit.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    // Create duplicate
    return prisma.kit.create({
      data: {
        name: copyName,
        slug,
        description: original.description,
        price: original.price,
        discount: original.discount,
        imageUrl: original.imageUrl,
        coverImage: original.coverImage,
        status: original.status,
        items: {
          create: original.items.map(item => ({
            equipmentId: item.equipmentId,
            serviceId: item.serviceId,
            quantity: item.quantity
          }))
        },
        experienceLevels: {
          create: original.experienceLevels.map(level => ({
            level: level.level,
            price: level.price,
            description: level.description,
            includes: level.includes
          }))
        }
      },
      include: { items: true, experienceLevels: true }
    });
  }
}

import { prisma } from "../config/prisma";
import type { Service, Prisma } from "@prisma/client";
import { generateSlug } from "../utils/slug";
import { randomBytes } from "crypto";

export class ServiceService {
  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    const imageUrl = data.imageUrl || "";
    const serviceData = { ...data } as any;
    
    delete serviceData.fileName;
    delete serviceData.folder;
    delete serviceData.uploadedFile;
    delete serviceData.imageUrl;
    
    let slug = generateSlug(serviceData.name);
    
    const slugExists = await prisma.service.findUnique({ where: { slug } });
    if (slugExists) {
        slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    return prisma.service.create({
      data: {
        ...serviceData,
        price: Number(data.price),
        duration: Number(data.duration),
        imageUrl,
        slug,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.ServiceUpdateInput,
  ): Promise<Service | null> {
    const imageUrl = data.imageUrl;
    const serviceData = { ...data } as any;
    
    delete serviceData.fileName;
    delete serviceData.folder;
    delete serviceData.uploadedFile;
    delete serviceData.imageUrl;
    
    return prisma.service.update({
      where: { id },
      data: {
        ...serviceData,
        ...(imageUrl && { imageUrl }),
      },
    });
  }

  async findAll(limit?: number, publicView = true): Promise<Service[]> {
    return prisma.service.findMany({
      where: {
        ...(publicView ? { status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] } } : {})
      },
      ...(limit ? { take: limit } : {}),
      orderBy: { name: 'asc' },
    });
  }

  async findOne(idOrSlug: string): Promise<Service & { prevSlug?: string | null; nextSlug?: string | null } | null> {
    const service = await prisma.service.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ]
      },
    });

    if (!service) return null;

    // Fetch neighbors (Previous and Next by name)
    const [prev, next] = await Promise.all([
      prisma.service.findFirst({
        where: {
          name: { lt: service.name },
          status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] }
        },
        orderBy: { name: 'desc' },
        select: { slug: true }
      }),
      prisma.service.findFirst({
        where: {
          name: { gt: service.name },
          status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] }
        },
        orderBy: { name: 'asc' },
        select: { slug: true }
      })
    ]);

    return {
      ...(service as any),
      prevSlug: prev?.slug || null,
      nextSlug: next?.slug || null
    };
  }

  async delete(id: string): Promise<void> {
    const service = await prisma.service.findUnique({
      where: { id },
      select: { imageUrl: true }
    });

    if (service?.imageUrl) {
      const { UploadService } = await import('./uploadService');
      const uploadService = new UploadService();
      await uploadService.deleteFile(service.imageUrl);
    }

    await prisma.service.delete({
      where: { id }
    });
  }

  async duplicate(id: string): Promise<Service> {
    const original = await prisma.service.findUnique({
      where: { id }
    });

    if (!original) {
      throw new Error('Service not found');
    }

    const copyName = `${original.name} (Cópia)`;
    let slug = generateSlug(copyName);

    const slugExists = await prisma.service.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    return prisma.service.create({
      data: {
        name: copyName,
        slug,
        description: original.description,
        price: original.price,
        duration: original.duration,
        status: original.status,
        imageUrl: original.imageUrl
      }
    });
  }
}

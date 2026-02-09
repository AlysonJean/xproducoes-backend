import { prisma } from "../config/prisma";
import type { Service, Prisma } from "@prisma/client";
import { generateSlug } from "../utils/slug";
import { randomBytes } from "crypto";

export class ServiceService {
  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    // imageUrl deve vir do middleware do Cloudinary
    const imageUrl = data.imageUrl || "";
    const serviceData = { ...data } as any;
    
    // Limpeza de campos internos/metadata de upload que não existem no banco
    delete serviceData.fileName;
    delete serviceData.folder;
    delete serviceData.uploadedFile;
    delete serviceData.imageUrl;
    
    // Gerar slug a partir do nome
    let slug = generateSlug(serviceData.name);
    
    // Verificar se slug existe e adicionar sufixo se necessário
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
    // imageUrl deve vir do middleware do Cloudinary (se fornecido)
    const imageUrl = data.imageUrl;
    const serviceData = { ...data } as any;
    
    // Limpeza de campos internos/metadata de upload
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

  async findOne(idOrSlug: string): Promise<Service | null> {
    return prisma.service.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ]
      },
    });
  }

  async delete(id: string): Promise<void> {
    // Get service to retrieve image URL before deletion
    const service = await prisma.service.findUnique({
      where: { id },
      select: { imageUrl: true }
    });

    // Delete image from Cloudinary if exists
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
    // Get original service
    const original = await prisma.service.findUnique({
      where: { id }
    });

    if (!original) {
      throw new Error('Service not found');
    }

    // Create copy with modified name
    const copyName = `${original.name} (Cópia)`;
    let slug = generateSlug(copyName);

    // Ensure unique slug
    const slugExists = await prisma.service.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    // Create duplicate
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

import { prisma } from "../config/prisma";
import type { Service, Prisma } from "@prisma/client";
import { generateSlug } from "../utils/slug";
import { randomBytes } from "crypto";

export class ServiceService {
  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    // imageUrl deve vir do middleware do Cloudinary
    const imageUrl = data.imageUrl || "";
    const serviceData = { ...data } as any;
    delete serviceData.fileName;
    
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
    delete serviceData.fileName;
    
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
    await prisma.service.delete({
      where: { id }
    });
  }
}

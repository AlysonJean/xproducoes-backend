import { prisma } from "../config/prisma";
import type { Service, Prisma } from "@prisma/client";
import { generateSlug } from "../utils/slug";
import { randomBytes } from "crypto";
import { NotFoundError } from "../utils/errors";

export class ServiceService {
  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    const {
      name,
      description,
      price,
      duration,
      imageUrl,
      ...rest
    } = data;

    let slug = generateSlug(name);
    
    const slugExists = await prisma.service.findUnique({ where: { slug } });
    if (slugExists) {
        slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    return prisma.service.create({
      data: {
        ...rest,
        name,
        description,
        price: Number(price),
        duration: Number(duration),
        imageUrl: imageUrl || "",
        slug,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.ServiceUpdateInput,
  ): Promise<Service | null> {
    const imageUrl = data.imageUrl;
    const serviceData: Record<string, unknown> = { ...data };
    
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
    // Achado: mesma causa do bug de "Serviço não encontrado" ao navegar por kits (slug pode
    // ser null) — select também inclui id para poder cair de volta nele quando o vizinho não
    // tiver slug, sem precisar de nenhuma mudança no frontend (prevSlug/nextSlug continuam
    // sendo só "o identificador pra usar na URL", não necessariamente um slug de verdade).
    const [prev, next] = await Promise.all([
      prisma.service.findFirst({
        where: {
          name: { lt: service.name },
          status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] }
        },
        orderBy: { name: 'desc' },
        select: { id: true, slug: true }
      }),
      prisma.service.findFirst({
        where: {
          name: { gt: service.name },
          status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] }
        },
        orderBy: { name: 'asc' },
        select: { id: true, slug: true }
      })
    ]);

    return {
      ...service,
      prevSlug: prev ? (prev.slug || prev.id) : null,
      nextSlug: next ? (next.slug || next.id) : null
    };
  }

  async delete(id: string): Promise<void> {
    const service = await prisma.service.findUnique({
      where: { id },
      select: { imageUrl: true }
    });

    // Mesma checagem de referência compartilhada que equipmentService.delete() — duplicate()
    // copia imageUrl por referência, então excluir um serviço não pode apagar do Cloudinary
    // uma imagem que outro serviço ainda usa.
    if (service?.imageUrl) {
      const stillReferenced = await prisma.service.count({
        where: { imageUrl: service.imageUrl, id: { not: id } }
      });
      if (stillReferenced === 0) {
        const { UploadService } = await import('./uploadService');
        const uploadService = new UploadService();
        await uploadService.deleteFile(service.imageUrl);
      }
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
      throw new NotFoundError('Serviço não encontrado');
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

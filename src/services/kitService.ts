import { KitRepository } from "../repositories/kitRepository";
import { prisma } from "../config/prisma";
import type { Prisma } from "@prisma/client";
import { generateSlug } from "../utils/slug";
import { randomBytes } from "crypto";

const repo = new KitRepository();

interface KitItemInput {
  id: string;
  quantity?: number;
  type?: 'EQUIPMENT' | 'SERVICE';
}

interface KitExperienceLevelInput {
  level: string;
  price?: number | string;
  description?: string;
  includes?: string[];
  isPopular?: boolean;
}

interface KitInputData {
  name?: string;
  imageUrl?: string;
  items?: KitItemInput[];
  equipmentIds?: string[];
  experienceLevels?: KitExperienceLevelInput[];
  fileName?: string;
  folder?: string;
  uploadedFile?: unknown;
  [key: string]: unknown;
}

export async function create(data: KitInputData, _file?: Express.Multer.File) {
  const kitData: Record<string, unknown> = { ...data };
  // imageUrl deve vir do middleware do Cloudinary
  if (data.imageUrl) {
    kitData.imageUrl = data.imageUrl;
  }
  
  // Relacionamento com itens (equips ou serviços) via KitItem
  if (Array.isArray(data.items)) {
    kitData.items = {
      create: data.items.map((item) => {
        // Assume que o item tem 'type' ou tentamos inferir
        // O frontend deve mandar: { id, quantity, type: 'EQUIPMENT' | 'SERVICE' }
        const isService = item.type === 'SERVICE';
        return {
          equipmentId: isService ? undefined : item.id,
          serviceId: isService ? item.id : undefined,
          quantity: typeof item.quantity === 'number' ? item.quantity : 1
        };
      }),
    };
  } else if (Array.isArray(data.equipmentIds)) {
    // Backward compatibility (legacy)
    kitData.items = {
      create: data.equipmentIds.map((id: string) => ({
        equipmentId: id,
        quantity: 1
      })),
    };
    delete kitData.equipmentIds;
  }


  // Remove campos que não existem no schema do Prisma
  delete kitData.fileName;
  delete kitData.folder;
  delete kitData.uploadedFile;
  
  // Experience Levels - processar se enviado
  if (Array.isArray(data.experienceLevels) && data.experienceLevels.length > 0) {
    kitData.experienceLevels = {
      create: data.experienceLevels.map((level) => ({
        level: level.level,
        price: typeof level.price === 'number' ? level.price : parseFloat(String(level.price)) || 0,
        description: level.description || null,
        includes: Array.isArray(level.includes) ? level.includes : [],
        isPopular: level.isPopular === true,
      })),
    };
  }

  // Gerar slug
  let slug = generateSlug(String(kitData.name || ''));
  try {
    const existing = await repo.findOne(slug);
    if (existing) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }
  } catch (_e) {
    // Se findOne falhar (ex: erro de banco), prosseguir com slug original ou lançar erro
  }
  kitData.slug = slug;

  return repo.create(kitData as Prisma.KitCreateInput);
}

export async function update(
  id: string,
  data: KitInputData,
  _file?: Express.Multer.File,
) {
  const kitData: Record<string, unknown> = { ...data };
  // imageUrl deve vir do middleware do Cloudinary
  if (data.imageUrl) {
    kitData.imageUrl = data.imageUrl;
  }
  
  if (Array.isArray(data.items)) {
    kitData.items = {
      deleteMany: {}, // Remove todos os itens existentes
      create: data.items.map((item) => {
        const isService = item.type === 'SERVICE';
        return {
          equipmentId: isService ? undefined : item.id,
          serviceId: isService ? item.id : undefined,
          quantity: typeof item.quantity === 'number' ? item.quantity : 1
        };
      }),
    };
  } else if (Array.isArray(data.equipmentIds)) {
    // Backward compatibility
    kitData.items = {
      deleteMany: {},
      create: data.equipmentIds.map((id: string) => ({
        equipmentId: id,
        quantity: 1
      })),
    };
    delete kitData.equipmentIds;
  }

  // Remove campos que não existem no schema do Prisma
  delete kitData.fileName;
  delete kitData.folder;
  delete kitData.uploadedFile;
  
  // Experience Levels - processar se enviado
  if (Array.isArray(data.experienceLevels)) {
    kitData.experienceLevels = {
      deleteMany: {}, // Remove todos os níveis existentes
      create: data.experienceLevels.map((level) => ({
        level: level.level,
        price: typeof level.price === 'number' ? level.price : parseFloat(String(level.price)) || 0,
        description: level.description || null,
        includes: Array.isArray(level.includes) ? level.includes : [],
        isPopular: level.isPopular === true,
      })),
    };
  }

  return repo.update(id, kitData as Prisma.KitUpdateInput);
}

export async function findAll(limit?: number, publicView = true) {
  return prisma.kit.findMany({
    where: {
      ...(publicView ? { status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] } } : {})
    },
    ...(limit ? { take: limit } : {}),
    orderBy: { createdAt: 'desc' },
    include: { 
      experienceLevels: true,
      items: { include: { equipment: true, service: true } }
    }
  });
}

export async function findOne(id: string) {
  return repo.findOne(id);
}

export async function deleteKit(id: string) {
  return repo.delete(id);
}

export async function findRecommended() {
  return repo.findRecommended();
}

export async function findPopular() {
  return repo.findPopular();
}

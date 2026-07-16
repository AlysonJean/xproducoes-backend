// backend/src/services/favoriteService.ts
//
// Achado (auditoria de produto): GET /user/favorites era um stub hardcoded que sempre
// retornava listas vazias (comentário do próprio código: "rota temporária... evitar
// 404") — favoritos nunca eram salvos no servidor, só em localStorage no navegador, sem
// sincronizar entre dispositivos. O modelo ClientFavorite já existia no schema, só nunca
// tinha um service/rota reais por trás.
import { prisma } from "../config/prisma";
import { BadRequestError } from "../utils/errors";

export type FavoriteType = "equipment" | "kit" | "service";

async function getOrCreateClientId(userId: string): Promise<string> {
  const client = await prisma.client.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return client.id;
}

function assertValidType(itemType: string): asserts itemType is FavoriteType {
  if (itemType !== "equipment" && itemType !== "kit" && itemType !== "service") {
    throw new BadRequestError("Tipo de favorito inválido. Use 'equipment', 'kit' ou 'service'.");
  }
}

export async function listFavorites(userId: string) {
  const clientId = await getOrCreateClientId(userId);
  const favorites = await prisma.clientFavorite.findMany({
    where: { clientId },
    include: {
      equipment: { select: { id: true, name: true, pricePerHour: true, imageUrl: true } },
      kit: { select: { id: true, name: true, price: true, description: true } },
      service: { select: { id: true, name: true, price: true, imageUrl: true } },
    },
  });

  return {
    equipments: favorites.map((f) => f.equipment).filter((e): e is NonNullable<typeof e> => !!e),
    kits: favorites.map((f) => f.kit).filter((k): k is NonNullable<typeof k> => !!k),
    services: favorites.map((f) => f.service).filter((s): s is NonNullable<typeof s> => !!s),
  };
}

export async function addFavorite(userId: string, itemId: string, itemType: string) {
  assertValidType(itemType);
  const clientId = await getOrCreateClientId(userId);

  if (itemType === "equipment") {
    return prisma.clientFavorite.upsert({
      where: { clientId_equipmentId: { clientId, equipmentId: itemId } },
      create: { clientId, equipmentId: itemId },
      update: {},
    });
  }
  if (itemType === "kit") {
    return prisma.clientFavorite.upsert({
      where: { clientId_kitId: { clientId, kitId: itemId } },
      create: { clientId, kitId: itemId },
      update: {},
    });
  }
  return prisma.clientFavorite.upsert({
    where: { clientId_serviceId: { clientId, serviceId: itemId } },
    create: { clientId, serviceId: itemId },
    update: {},
  });
}

export async function removeFavorite(userId: string, itemId: string, itemType: string) {
  assertValidType(itemType);
  const clientId = await getOrCreateClientId(userId);

  try {
    if (itemType === "equipment") {
      await prisma.clientFavorite.delete({ where: { clientId_equipmentId: { clientId, equipmentId: itemId } } });
    } else if (itemType === "kit") {
      await prisma.clientFavorite.delete({ where: { clientId_kitId: { clientId, kitId: itemId } } });
    } else {
      await prisma.clientFavorite.delete({ where: { clientId_serviceId: { clientId, serviceId: itemId } } });
    }
  } catch {
    // Já não era favorito — remoção idempotente, não é erro para o chamador.
  }
}

// OBSOLETO: Centralizado no Prisma Client
// Caminho do arquivo: backend/src/repositories/cartRepository.ts

import { prisma } from "../config/prisma";

export class CartRepository {
  async findOrCreateCart(userId: string) {
    let cart = await prisma.booking.findFirst({
      where: { creatorId: userId, status: "DRAFT" },
      include: {
        equipments: {
          select: { id: true, name: true, pricePerHour: true, imageUrl: true },
        },
        kit: {
          select: { id: true, name: true, price: true, description: true },
        },
      },
    });

    if (!cart) {
      cart = await prisma.booking.create({
        data: {
          creatorId: userId,
          status: "DRAFT",
          totalPrice: 0,
          eventDate: new Date(),
          eventEndDate: new Date(),
        },
        include: {
          equipments: {
            select: {
              id: true,
              name: true,
              pricePerHour: true,
              imageUrl: true,
            },
          },
          kit: {
            select: { id: true, name: true, price: true, description: true },
          },
        },
      });
    }
    return cart;
  }

  async findCartById(cartId: string) {
    return prisma.booking.findUnique({
      where: { id: cartId },
      include: {
        equipments: {
          select: { id: true, name: true, pricePerHour: true, imageUrl: true },
        },
        kit: {
          select: { id: true, name: true, price: true, description: true },
        },
      },
    });
  }

  async addItems(cartId: string, equipmentIds: string[]) {
    // Verificação de segurança sugerida por você
    const cartExists = await prisma.booking.findUnique({
      where: { id: cartId },
    });
    if (!cartExists) {
      throw new Error(
        "Carrinho não encontrado. Não é possível adicionar itens.",
      );
    }

    return prisma.booking.update({
      where: { id: cartId },
      data: {
        equipments: {
          connect: equipmentIds.map((id) => ({ id })),
        },
      },
      include: {
        equipments: {
          select: { id: true, name: true, pricePerHour: true, imageUrl: true },
        },
        kit: {
          select: { id: true, name: true, price: true, description: true },
        },
      },
    });
  }

  async removeItem(cartId: string, equipmentId: string) {
    return prisma.booking.update({
      where: { id: cartId },
      data: {
        equipments: {
          disconnect: { id: equipmentId },
        },
      },
      include: {
        equipments: {
          select: { id: true, name: true, pricePerHour: true, imageUrl: true },
        },
        kit: {
          select: { id: true, name: true, price: true, description: true },
        },
      },
    });
  }

  async updateKit(cartId: string, kitId: string) {
    return prisma.booking.update({
      where: { id: cartId },
      data: { kitId },
      include: {
        equipments: {
          select: { id: true, name: true, pricePerHour: true, imageUrl: true },
        },
        kit: {
          select: { id: true, name: true, price: true, description: true },
        },
      },
    });
  }

  async clearEquipments(cartId: string) {
    return prisma.booking.update({
      where: { id: cartId },
      data: {
        equipments: {
          set: [],
        },
      },
      include: {
        equipments: {
          select: { id: true, name: true, pricePerHour: true, imageUrl: true },
        },
        kit: {
          select: { id: true, name: true, price: true, description: true },
        },
      },
    });
  }

  async clearKit(cartId: string) {
    return prisma.booking.update({
      where: { id: cartId },
      data: { kitId: null },
      include: {
        equipments: {
          select: { id: true, name: true, pricePerHour: true, imageUrl: true },
        },
        kit: {
          select: { id: true, name: true, price: true, description: true },
        },
      },
    });
  }
}

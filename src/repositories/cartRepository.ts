// Caminho do arquivo: backend/src/repositories/cartRepository.ts

import { prisma } from "../config/prisma";

const CART_INCLUDE = {
  equipments: {
    select: { id: true, name: true, pricePerHour: true, imageUrl: true },
  },
  services: {
    select: { id: true, name: true, price: true, imageUrl: true, duration: true },
  },
  kit: {
    select: { id: true, name: true, price: true, description: true },
  },
};

export class CartRepository {
  async findOrCreateCart(userId: string) {
    let cart = await prisma.booking.findFirst({
      where: { creatorId: userId, status: "DRAFT" },
      include: CART_INCLUDE,
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
        include: CART_INCLUDE,
      });
    }
    return cart;
  }

  async findCartById(cartId: string) {
    return prisma.booking.findUnique({
      where: { id: cartId },
      include: CART_INCLUDE,
    });
  }

  async addItems(cartId: string, equipmentIds: string[]) {
    const cartExists = await prisma.booking.findUnique({
      where: { id: cartId },
    });
    if (!cartExists) {
      throw new Error("Carrinho não encontrado. Não é possível adicionar itens.");
    }

    return prisma.booking.update({
      where: { id: cartId },
      data: {
        equipments: {
          connect: equipmentIds.map((id) => ({ id })),
        },
      },
      include: CART_INCLUDE,
    });
  }

  async addService(cartId: string, serviceId: string) {
    const cartExists = await prisma.booking.findUnique({
      where: { id: cartId },
    });
    if (!cartExists) {
      throw new Error("Carrinho não encontrado. Não é possível adicionar serviços.");
    }

    return prisma.booking.update({
      where: { id: cartId },
      data: {
        services: {
          connect: { id: serviceId },
        },
      },
      include: CART_INCLUDE,
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
      include: CART_INCLUDE,
    });
  }

  async removeService(cartId: string, serviceId: string) {
    return prisma.booking.update({
      where: { id: cartId },
      data: {
        services: {
          disconnect: { id: serviceId },
        },
      },
      include: CART_INCLUDE,
    });
  }

  async updateKit(cartId: string, kitId: string) {
    return prisma.booking.update({
      where: { id: cartId },
      data: { kitId },
      include: CART_INCLUDE,
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
      include: CART_INCLUDE,
    });
  }

  async clearServices(cartId: string) {
    return prisma.booking.update({
      where: { id: cartId },
      data: {
        services: {
          set: [],
        },
      },
      include: CART_INCLUDE,
    });
  }

  async clearKit(cartId: string) {
    return prisma.booking.update({
      where: { id: cartId },
      data: { kitId: null },
      include: CART_INCLUDE,
    });
  }
}

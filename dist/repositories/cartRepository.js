"use strict";
// OBSOLETO: Centralizado no Prisma Client
// Caminho do arquivo: backend/src/repositories/cartRepository.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartRepository = void 0;
const prisma_1 = require("../config/prisma");
class CartRepository {
    async findOrCreateCart(userId) {
        let cart = await prisma_1.prisma.booking.findFirst({
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
            cart = await prisma_1.prisma.booking.create({
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
    async findCartById(cartId) {
        return prisma_1.prisma.booking.findUnique({
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
    async addItems(cartId, equipmentIds) {
        // Verificação de segurança sugerida por você
        const cartExists = await prisma_1.prisma.booking.findUnique({
            where: { id: cartId },
        });
        if (!cartExists) {
            throw new Error("Carrinho não encontrado. Não é possível adicionar itens.");
        }
        return prisma_1.prisma.booking.update({
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
    async removeItem(cartId, equipmentId) {
        return prisma_1.prisma.booking.update({
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
    async updateKit(cartId, kitId) {
        return prisma_1.prisma.booking.update({
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
    async clearEquipments(cartId) {
        return prisma_1.prisma.booking.update({
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
    async clearKit(cartId) {
        return prisma_1.prisma.booking.update({
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
exports.CartRepository = CartRepository;

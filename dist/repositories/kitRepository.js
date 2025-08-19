"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KitRepository = void 0;
// OBSOLETO: Centralizado no Prisma Client
const prisma_1 = require("../config/prisma");
class KitRepository {
    async create(data) {
        return prisma_1.prisma.kit.create({ data });
    }
    async findAll() {
        return prisma_1.prisma.kit.findMany({ include: { equipments: true } });
    }
    async findOne(id) {
        return prisma_1.prisma.kit.findUnique({
            where: { id },
            include: { equipments: true },
        });
    }
    async update(id, data) {
        return prisma_1.prisma.kit.update({ where: { id }, data });
    }
    async delete(id) {
        return prisma_1.prisma.kit.delete({ where: { id } });
    }
    async findRecommended() {
        // Retorna kits com maior quantidade de equipamentos
        return prisma_1.prisma.kit.findMany({
            include: {
                equipments: true,
                _count: {
                    select: {
                        equipments: true,
                    },
                },
            },
            orderBy: {
                equipments: {
                    _count: 'desc',
                },
            },
            take: 6,
        });
    }
    async findPopular() {
        // Retorna kits mais utilizados em bookings
        return prisma_1.prisma.kit.findMany({
            include: {
                equipments: true,
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
}
exports.KitRepository = KitRepository;

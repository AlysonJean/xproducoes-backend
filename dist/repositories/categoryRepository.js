"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const prisma_1 = require("../config/prisma");
class CategoryRepository {
    async create(data) {
        return prisma_1.prisma.category.create({ data });
    }
    async update(id, data) {
        return prisma_1.prisma.category.update({
            where: { id },
            data,
        });
    }
    async findAll() {
        return prisma_1.prisma.category.findMany();
    }
    async delete(id) {
        return prisma_1.prisma.category.delete({ where: { id } });
    }
    async countEquipments(id) {
        return prisma_1.prisma.equipment.count({ where: { categoryId: id } });
    }
    async findById(id) {
        return prisma_1.prisma.category.findUnique({
            where: { id },
            include: {
                equipments: true,
            },
        });
    }
    async findAllWithEquipmentCount() {
        return prisma_1.prisma.category.findMany({
            include: {
                _count: {
                    select: {
                        equipments: true,
                    },
                },
            },
        });
    }
    async findFeatured() {
        // Para agora, retornamos as primeiras 6 categorias que têm equipamentos
        return prisma_1.prisma.category.findMany({
            where: {
                equipments: {
                    some: {},
                },
            },
            include: {
                _count: {
                    select: {
                        equipments: true,
                    },
                },
            },
            take: 6,
            orderBy: {
                equipments: {
                    _count: 'desc',
                },
            },
        });
    }
}
exports.CategoryRepository = CategoryRepository;

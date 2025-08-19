"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentRepository = void 0;
// OBSOLETO: Centralizado no Prisma Client
const prisma_1 = require("../config/prisma");
class EquipmentRepository {
    // ===== MÉTODOS OTIMIZADOS PARA PERFORMANCE =====
    // Buscar equipamentos com category incluída (elimina N+1)
    async findAllWithCategories() {
        return prisma_1.prisma.equipment.findMany({
            include: {
                category: {
                    select: { id: true, name: true, icon: true },
                },
            },
            orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
        });
    }
    // Buscar por categoria com paginação otimizada
    async findByCategory(categoryId, page = 1, limit = 12) {
        const skip = (page - 1) * limit;
        const [equipments, total] = await Promise.all([
            prisma_1.prisma.equipment.findMany({
                where: { categoryId },
                include: {
                    category: {
                        select: { id: true, name: true, icon: true },
                    },
                },
                orderBy: { name: "asc" },
                skip,
                take: limit,
            }),
            prisma_1.prisma.equipment.count({ where: { categoryId } }),
        ]);
        return {
            equipments,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1,
            },
        };
    }
    // Equipment stats para dashboard (query única)
    async getEquipmentStats() {
        const [totalEquipments, availableEquipments, categoriesWithCount] = await Promise.all([
            prisma_1.prisma.equipment.count(),
            prisma_1.prisma.equipment.count({ where: { quantity: { gt: 0 } } }),
            prisma_1.prisma.category.findMany({
                select: {
                    id: true,
                    name: true,
                    _count: { select: { equipments: true } },
                },
                orderBy: { name: "asc" },
            }),
        ]);
        return {
            totalEquipments,
            availableEquipments,
            unavailableEquipments: totalEquipments - availableEquipments,
            categoriesWithCount,
        };
    }
    // Popular equipments com bookings count (performance otimizada)
    async getPopularEquipments(limit = 10) {
        return prisma_1.prisma.equipment.findMany({
            include: {
                category: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { bookings: true },
                },
            },
            orderBy: {
                bookings: { _count: "desc" },
            },
            take: limit,
        });
    }
    // Métodos existentes (findAll, search, etc.)
    async findAll() {
        return prisma_1.prisma.equipment.findMany({ include: { category: true } });
    }
    // Novo método para pesquisa avançada com paginação
    async search(params) {
        const { query, categoryId, minPrice, maxPrice, sortBy, page = 1, limit = 12, } = params;
        const where = {};
        const orderBy = {};
        if (query) {
            where.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
            ];
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (minPrice || maxPrice) {
            where.pricePerHour = {};
            if (minPrice)
                where.pricePerHour.gte = minPrice;
            if (maxPrice)
                where.pricePerHour.lte = maxPrice;
        }
        if (sortBy === "price_asc") {
            orderBy.pricePerHour = "asc";
        }
        else if (sortBy === "price_desc") {
            orderBy.pricePerHour = "desc";
        }
        else if (sortBy === "name_asc") {
            orderBy.name = "asc";
        }
        else if (sortBy === "name_desc") {
            orderBy.name = "desc";
        }
        else {
            orderBy.name = "asc"; // Default
        }
        const skip = (page - 1) * limit;
        // Count total items
        const totalItems = await prisma_1.prisma.equipment.count({ where });
        // Get paginated data
        const data = await prisma_1.prisma.equipment.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
                category: true,
            },
        });
        const totalPages = Math.ceil(totalItems / limit);
        return {
            data,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
}
exports.EquipmentRepository = EquipmentRepository;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentService = void 0;
const prisma_1 = require("../config/prisma");
class EquipmentService {
    async create(data, file) {
        // imageUrl deve vir do middleware do Cloudinary
        const imageUrl = data.imageUrl || "";
        return prisma_1.prisma.equipment.create({
            data: {
                ...data,
                pricePerHour: Number(data.pricePerHour),
                quantity: Number(data.quantity),
                imageUrl,
            },
        });
    }
    async update(id, data, file) {
        // imageUrl deve vir do middleware do Cloudinary (se fornecido)
        const imageUrl = data.imageUrl;
        return prisma_1.prisma.equipment.update({
            where: { id },
            data: {
                ...data,
                ...(imageUrl && { imageUrl }),
            },
        });
    }
    async findAll() {
        return prisma_1.prisma.equipment.findMany();
    }
    async findOne(id) {
        return prisma_1.prisma.equipment.findUnique({ where: { id } });
    }
    async delete(id) {
        await prisma_1.prisma.equipment.delete({ where: { id } });
    }
    async search(query) {
        // Exemplo simples de busca por nome/categoria
        const { name, categoryId } = query;
        return prisma_1.prisma.equipment.findMany({
            where: {
                ...(name && { name: { contains: name, mode: "insensitive" } }),
                ...(categoryId && { categoryId }),
            },
        });
    }
    async getAvailability(id, month, year) {
        // Implemente a lógica de disponibilidade conforme seu domínio
        return { available: true, month, year };
    }
    async findByCategory(categoryId) {
        return prisma_1.prisma.equipment.findMany({
            where: { categoryId },
            include: {
                category: true,
            },
        });
    }
    async getTotalEquipments() {
        return prisma_1.prisma.equipment.count();
    }
}
exports.EquipmentService = EquipmentService;

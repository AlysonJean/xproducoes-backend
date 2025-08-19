"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioRepository = void 0;
// OBSOLETO: Centralizado no Prisma Client
const prisma_1 = require("../config/prisma");
class PortfolioRepository {
    async create(data) {
        return prisma_1.prisma.portfolioItem.create({ data });
    }
    async findAll() {
        return prisma_1.prisma.portfolioItem.findMany();
    }
    async delete(id) {
        return prisma_1.prisma.portfolioItem.delete({ where: { id } });
    }
}
exports.PortfolioRepository = PortfolioRepository;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaqService = void 0;
const prisma_1 = require("../config/prisma");
class FaqService {
    static async create(data) {
        return prisma_1.prisma.faq.create({
            data: {
                question: data.question,
                answer: data.answer,
            },
        });
    }
    static async findAll() {
        return prisma_1.prisma.faq.findMany({
            orderBy: { createdAt: "desc" },
        });
    }
    static async findById(id) {
        return prisma_1.prisma.faq.findUnique({
            where: { id },
        });
    }
    static async update(id, data) {
        return prisma_1.prisma.faq.update({
            where: { id },
            data,
        });
    }
    static async delete(id) {
        return prisma_1.prisma.faq.delete({
            where: { id },
        });
    }
}
exports.FaqService = FaqService;

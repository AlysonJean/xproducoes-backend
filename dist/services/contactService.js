"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
exports.createSubmission = createSubmission;
exports.getAllSubmissions = getAllSubmissions;
exports.markAsRead = markAsRead;
exports.deleteSubmission = deleteSubmission;
const prisma_1 = require("../config/prisma");
async function createSubmission(data) {
    return prisma_1.prisma.contact.create({ data });
}
async function getAllSubmissions() {
    return prisma_1.prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
}
async function markAsRead(id) {
    return prisma_1.prisma.contact.update({ where: { id }, data: { isRead: true } });
}
async function deleteSubmission(id) {
    return prisma_1.prisma.contact.delete({ where: { id } });
}
// Classe para compatibilidade
class ContactService {
    async create(data) {
        return createSubmission(data);
    }
    async findAll() {
        return getAllSubmissions();
    }
    async markAsRead(id) {
        return markAsRead(id);
    }
    async delete(id) {
        return deleteSubmission(id);
    }
    // Métodos adicionais para compatibilidade
    async createSubmission(data) {
        return this.create(data);
    }
    async getAllSubmissions() {
        return this.findAll();
    }
}
exports.ContactService = ContactService;

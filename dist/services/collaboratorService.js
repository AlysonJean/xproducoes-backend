"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaboratorService = void 0;
exports.createCollaborator = createCollaborator;
exports.getAllCollaborators = getAllCollaborators;
exports.getCollaboratorById = getCollaboratorById;
exports.updateCollaborator = updateCollaborator;
exports.deleteCollaborator = deleteCollaborator;
exports.assignCollaboratorToEvent = assignCollaboratorToEvent;
exports.getEventCollaborators = getEventCollaborators;
exports.getCollaboratorEvents = getCollaboratorEvents;
exports.searchCollaborators = searchCollaborators;
exports.getCollaboratorStats = getCollaboratorStats;
exports.getCollaboratorDashboard = getCollaboratorDashboard;
exports.getAvailableCollaborators = getAvailableCollaborators;
exports.getAllAvailabilities = getAllAvailabilities;
exports.getCollaboratorAvailabilities = getCollaboratorAvailabilities;
exports.getAllPayments = getAllPayments;
exports.createPaymentRecord = createPaymentRecord;
exports.updatePayment = updatePayment;
exports.getCollaboratorPayments = getCollaboratorPayments;
exports.getPaymentStats = getPaymentStats;
const collaboratorRepository_1 = require("../repositories/collaboratorRepository");
const repo = new collaboratorRepository_1.CollaboratorRepository();
async function createCollaborator(data) {
    return repo.create(data);
}
async function getAllCollaborators() {
    return repo.findAll();
}
async function getCollaboratorById(id) {
    return repo.findById(id);
}
async function updateCollaborator(id, data) {
    return repo.update(id, data);
}
async function deleteCollaborator(id) {
    return repo.delete(id);
}
async function assignCollaboratorToEvent(data) {
    return repo.assignToEvent(data);
}
async function getEventCollaborators(eventId) {
    return repo.findEventCollaborators(eventId);
}
async function getCollaboratorEvents(collaboratorId) {
    return repo.findCollaboratorEvents(collaboratorId);
}
async function searchCollaborators(params) {
    return repo.search(params);
}
async function getCollaboratorStats(id) {
    return repo.getCollaboratorStats(id);
}
async function getCollaboratorDashboard(id) {
    return repo.getCollaboratorDashboard(id);
}
async function getAvailableCollaborators(date, role) {
    return repo.getAvailableCollaborators(new Date(date), role);
}
async function getAllAvailabilities() {
    return repo.findAllAvailabilities();
}
async function getCollaboratorAvailabilities() {
    // Busca por colaborador (stub)
    // Exemplo: return prisma.collaborator.findMany({ where: { ... } });
    return [];
}
async function getAllPayments() {
    return repo.findAllPayments();
}
async function createPaymentRecord(data) {
    return repo.createPaymentRecord(data);
}
async function updatePayment(id, data) {
    return repo.updatePayment(id, data);
}
async function getCollaboratorPayments() {
    // Busca por colaborador (stub)
    // Exemplo: return prisma.collaborator.findMany({ where: { ... } });
    return [];
}
async function getPaymentStats() {
    // Busca por colaborador (stub)
    // Exemplo: return prisma.collaborator.findMany({ where: { ... } });
    return [];
}
// Classe para compatibilidade com controllers
class CollaboratorService {
    async create(data) {
        return createCollaborator(data);
    }
    async findAll() {
        return getAllCollaborators();
    }
    async findById(id) {
        return getCollaboratorById(id);
    }
    async update(id, data) {
        return updateCollaborator(id, data);
    }
    async delete(id) {
        return deleteCollaborator(id);
    }
    async searchByName(name) {
        return searchCollaborators(name);
    }
    async getCollaboratorsByRole(role) {
        // Implementação simples
        return [];
    }
    async getPaymentStats() {
        return getPaymentStats();
    }
    // Métodos adicionais para o collaboratorController
    async createCollaborator(data) {
        return this.create(data);
    }
    async getAllCollaborators() {
        return this.findAll();
    }
    async getCollaboratorById(id) {
        return this.findById(id);
    }
    async updateCollaborator(id, data) {
        return this.update(id, data);
    }
    async deleteCollaborator(id) {
        return this.delete(id);
    }
    async assignCollaboratorToEvent(data) {
        // Implementação simples - expandir conforme necessário
        return {
            id: `assignment_${Date.now()}`,
            ...data,
            createdAt: new Date()
        };
    }
    async getEventCollaborators(eventId) {
        // Implementação simples
        return [];
    }
    async getCollaboratorEvents(collaboratorId) {
        // Implementação simples
        return [];
    }
    async searchCollaborators(params) {
        return this.searchByName(params.name || '');
    }
    async getCollaboratorStats(id) {
        return {
            totalEvents: 0,
            completedEvents: 0,
            rating: 0,
            earnings: 0
        };
    }
    async getCollaboratorDashboard(id) {
        return getCollaboratorDashboard(id);
    }
    async getAvailableCollaborators(data) {
        return [];
    }
    async getAllAvailabilities() {
        return [];
    }
    async getCollaboratorAvailabilities() {
        return [];
    }
    async getAllPayments() {
        return [];
    }
    async createPaymentRecord(data) {
        return {
            id: `payment_${Date.now()}`,
            ...data,
            createdAt: new Date()
        };
    }
    async updatePayment(id, data) {
        return repo.updatePayment(id, data);
    }
    async getCollaboratorPayments() {
        return [];
    }
}
exports.CollaboratorService = CollaboratorService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactRepository = void 0;
class ContactRepository {
    async create(data) {
        // Implementação simulada até o modelo Contact ser adicionado ao schema
        const submission = {
            id: Math.random().toString(36).substr(2, 9),
            name: data.name,
            email: data.email,
            message: data.message,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        return submission;
    }
    async findAll() {
        // Implementação simulada até o modelo Contact ser adicionado ao schema
        return [];
    }
    async delete(id) {
        // Implementação simulada até o modelo Contact ser adicionado ao schema
        return null;
    }
    async updateAsRead(id) {
        // Implementação simulada até o modelo Contact ser adicionado ao schema
        const submission = {
            id,
            name: "Exemplo",
            email: "exemplo@email.com",
            message: "Mensagem de exemplo",
            isRead: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        return submission;
    }
    async findById(id) {
        // Implementação simulada até o modelo Contact ser adicionado ao schema
        return null;
    }
}
exports.ContactRepository = ContactRepository;

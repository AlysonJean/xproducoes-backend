"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventCollaborator = exports.getPaymentStats = exports.getCollaboratorPayments = exports.deletePayment = exports.updatePayment = exports.createPayment = exports.getAllPayments = exports.getCollaboratorAvailabilities = exports.deleteAvailability = exports.updateAvailability = exports.createAvailability = exports.getAllAvailabilities = exports.getAvailableCollaborators = exports.getMyDashboard = exports.getCollaboratorStats = exports.searchCollaborators = exports.removeCollaboratorFromEvent = exports.updateEventCollaborator = exports.getCollaboratorEvents = exports.getEventCollaborators = exports.getAllEventCollaborators = exports.assignCollaboratorToEvent = exports.deleteCollaborator = exports.updateCollaborator = exports.getCollaboratorById = exports.getAllCollaborators = exports.createCollaborator = exports.CollaboratorController = void 0;
const collaboratorService_1 = require("../services/collaboratorService");
const zod_1 = require("zod");
const collaboratorService = new collaboratorService_1.CollaboratorService();
// Schemas de validação
const createCollaboratorSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nome é obrigatório"),
    email: zod_1.z.string().email("Email inválido"),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.enum([
        "PHOTOGRAPHER",
        "VIDEOGRAPHER",
        "SOUND_TECHNICIAN",
        "LIGHTING_TECHNICIAN",
        "DJ",
        "PRESENTER",
        "COORDINATOR",
        "ASSISTANT",
        "SECURITY",
        "TRANSPORT",
        "OTHER",
    ]),
    specialties: zod_1.z.array(zod_1.z.string()).default([]),
    hourlyRate: zod_1.z.number().min(0, "Taxa deve ser positiva"),
    fixedRate: zod_1.z.number().optional(),
    commissionRate: zod_1.z.number().optional(),
    status: zod_1.z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
    availabilityStatus: zod_1.z.enum(["AVAILABLE", "BUSY", "OFF_DUTY"]).optional(),
});
const assignCollaboratorSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid("ID do evento inválido"),
    collaboratorId: zod_1.z.string().uuid("ID do colaborador inválido"),
    role: zod_1.z.enum([
        "PHOTOGRAPHER",
        "VIDEOGRAPHER",
        "SOUND_TECHNICIAN",
        "LIGHTING_TECHNICIAN",
        "DJ",
        "PRESENTER",
        "COORDINATOR",
        "ASSISTANT",
        "SECURITY",
        "TRANSPORT",
        "OTHER",
    ]),
    startTime: zod_1.z.string().min(1, "Hora de início é obrigatória"),
    endTime: zod_1.z.string().min(1, "Hora de fim é obrigatória"),
    hourlyRate: zod_1.z.number().optional(),
    fixedRate: zod_1.z.number().optional(),
    status: zod_1.z
        .enum([
        "ASSIGNED",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
    ])
        .optional(),
    notes: zod_1.z.string().optional(),
});
class CollaboratorController {
    // CRUD de Colaboradores
    async createCollaborator(req, res) {
        try {
            const validatedData = createCollaboratorSchema.parse(req.body);
            // Mapear 'role' para 'collaboratorRole' e incluir dados do usuário
            const collaboratorData = {
                name: validatedData.name,
                email: validatedData.email,
                phone: validatedData.phone,
                collaboratorRole: validatedData.role,
                specialties: validatedData.specialties,
                hourlyRate: validatedData.hourlyRate,
                fixedRate: validatedData.fixedRate,
                commissionRate: validatedData.commissionRate,
                status: validatedData.status,
                availabilityStatus: validatedData.availabilityStatus,
            };
            const collaborator = await collaboratorService.createCollaborator(collaboratorData);
            return res.status(201).json({
                success: true,
                data: collaborator,
                message: "Colaborador criado com sucesso",
            });
        }
        catch (error) {
            console.error("Erro ao criar colaborador:", error);
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos",
                    errors: error.issues,
                });
            }
            return res.status(500).json({
                success: false,
                message: "Erro interno do servidor",
            });
        }
    }
    async getAllCollaborators(req, res) {
        try {
            const collaborators = await collaboratorService.getAllCollaborators();
            return res.json({
                success: true,
                data: collaborators,
            });
        }
        catch (error) {
            console.error("Erro ao buscar colaboradores:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar colaboradores",
            });
        }
    }
    async getCollaboratorById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID do colaborador é obrigatório",
                });
            }
            const collaborator = await collaboratorService.getCollaboratorById(id);
            if (!collaborator) {
                return res.status(404).json({
                    success: false,
                    message: "Colaborador não encontrado",
                });
            }
            return res.json({
                success: true,
                data: collaborator,
            });
        }
        catch (error) {
            console.error("Erro ao buscar colaborador:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar colaborador",
            });
        }
    }
    async updateCollaborator(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID do colaborador é obrigatório",
                });
            }
            const collaborator = await collaboratorService.updateCollaborator(id, updateData);
            return res.json({
                success: true,
                data: collaborator,
                message: "Colaborador atualizado com sucesso",
            });
        }
        catch (error) {
            console.error("Erro ao atualizar colaborador:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao atualizar colaborador",
            });
        }
    }
    async deleteCollaborator(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID do colaborador é obrigatório",
                });
            }
            await collaboratorService.deleteCollaborator(id);
            return res.json({
                success: true,
                message: "Colaborador removido com sucesso",
            });
        }
        catch (error) {
            console.error("Erro ao deletar colaborador:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao deletar colaborador",
            });
        }
    }
    // Gestão de Eventos
    async assignCollaboratorToEvent(req, res) {
        try {
            const validatedData = assignCollaboratorSchema.parse(req.body);
            const assignment = await collaboratorService.assignCollaboratorToEvent({
                ...validatedData,
                bookingId: validatedData.eventId,
            });
            return res.status(201).json({
                success: true,
                data: assignment,
                message: "Colaborador atribuído ao evento com sucesso",
            });
        }
        catch (error) {
            console.error("Erro ao atribuir colaborador:", error);
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos",
                    errors: error.issues,
                });
            }
            return res.status(500).json({
                success: false,
                message: "Erro ao atribuir colaborador ao evento",
            });
        }
    }
    async getEventCollaborators(req, res) {
        try {
            const { eventId } = req.params;
            if (!eventId) {
                return res.status(400).json({
                    success: false,
                    message: "ID do evento é obrigatório",
                });
            }
            const collaborators = await collaboratorService.getEventCollaborators(eventId);
            return res.json({
                success: true,
                data: collaborators,
            });
        }
        catch (error) {
            console.error("Erro ao buscar colaboradores do evento:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar colaboradores do evento",
            });
        }
    }
    async getCollaboratorEvents(req, res) {
        try {
            const { collaboratorId } = req.params;
            if (!collaboratorId) {
                return res.status(400).json({
                    success: false,
                    message: "ID do colaborador é obrigatório",
                });
            }
            const events = await collaboratorService.getCollaboratorEvents(collaboratorId);
            return res.json({
                success: true,
                data: events,
            });
        }
        catch (error) {
            console.error("Erro ao buscar eventos do colaborador:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar eventos do colaborador",
            });
        }
    }
    async updateEventCollaborator(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID da atribuição é obrigatório",
                });
            }
            // Método não implementado no service
            return res.status(501).json({
                success: false,
                message: "Atualização de colaborador em evento não implementada ainda",
            });
        }
        catch (error) {
            console.error("Erro ao atualizar atribuição:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao atualizar atribuição",
            });
        }
    }
    async removeCollaboratorFromEvent(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID da atribuição é obrigatório",
                });
            }
            // Método não implementado no service
            return res.status(501).json({
                success: false,
                message: "Remoção de colaborador de evento não implementada ainda",
            });
        }
        catch (error) {
            console.error("Erro ao remover colaborador do evento:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao remover colaborador do evento",
            });
        }
    }
    // Busca e estatísticas
    async searchCollaborators(req, res) {
        try {
            const { role, status, name, page = "1", limit = "10" } = req.query;
            const searchParams = {
                role: role,
                status: status,
                name: name,
                page: parseInt(page),
                limit: parseInt(limit),
            };
            const result = await collaboratorService.searchCollaborators(searchParams);
            return res.json({
                success: true,
                data: result.collaborators,
                pagination: result.pagination,
            });
        }
        catch (error) {
            console.error("Erro ao buscar colaboradores:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar colaboradores",
            });
        }
    }
    async getCollaboratorStats(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID do colaborador é obrigatório",
                });
            }
            const stats = await collaboratorService.getCollaboratorStats(id);
            return res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            console.error("Erro ao buscar estatísticas:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar estatísticas do colaborador",
            });
        }
    }
    // Dashboard pessoal do colaborador (ou admin vendo um colaborador específico)
    async getMyDashboard(req, res) {
        try {
            // Obter ID do colaborador a partir do usuário autenticado
            const collaboratorId = req.userId;
            if (!collaboratorId) {
                return res.status(400).json({ success: false, message: 'Usuário não autenticado' });
            }
            // Reutiliza o service para agregar os dados do dashboard
            const stats = await collaboratorService.getCollaboratorDashboard(collaboratorId);
            return res.json({ success: true, data: stats });
        }
        catch (error) {
            console.error('Erro ao buscar dashboard do colaborador:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar dashboard do colaborador' });
        }
    }
    async getAvailableCollaborators(req, res) {
        try {
            const { date, role } = req.query;
            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: "Data é obrigatória",
                });
            }
            const collaborators = await collaboratorService.getAvailableCollaborators({
                date: date,
                role: role,
            });
            return res.json({
                success: true,
                data: collaborators,
            });
        }
        catch (error) {
            console.error("Erro ao buscar colaboradores disponíveis:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar colaboradores disponíveis",
            });
        }
    }
    // Gerenciamento de Disponibilidades
    async getAllAvailabilities(req, res) {
        try {
            const availabilities = await collaboratorService.getAllAvailabilities();
            return res.json({
                success: true,
                data: availabilities,
            });
        }
        catch (error) {
            console.error("Erro ao buscar disponibilidades:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar disponibilidades",
            });
        }
    }
    async createAvailability(req, res) {
        try {
            const availabilitySchema = zod_1.z.object({
                collaboratorId: zod_1.z.string().uuid("ID do colaborador inválido"),
                startDate: zod_1.z.string().min(1, "Data de início é obrigatória"),
                endDate: zod_1.z.string().min(1, "Data de fim é obrigatória"),
                startTime: zod_1.z.string().optional(),
                endTime: zod_1.z.string().optional(),
                dayOfWeek: zod_1.z
                    .enum([
                    "MONDAY",
                    "TUESDAY",
                    "WEDNESDAY",
                    "THURSDAY",
                    "FRIDAY",
                    "SATURDAY",
                    "SUNDAY",
                ])
                    .optional(),
                isRecurring: zod_1.z.boolean().default(false),
                status: zod_1.z.enum(["AVAILABLE", "BUSY", "OFF_DUTY"]).default("AVAILABLE"),
                notes: zod_1.z.string().optional(),
            });
            const validatedData = availabilitySchema.parse(req.body);
            return res.status(501).json({
                success: false,
                message: "Criação de disponibilidade não implementada ainda",
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos",
                    errors: error.issues,
                });
            }
            console.error("Erro ao criar disponibilidade:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao criar disponibilidade",
            });
        }
    }
    async updateAvailability(req, res) {
        try {
            const { id } = req.params;
            const updateSchema = zod_1.z.object({
                startDate: zod_1.z.string().optional(),
                endDate: zod_1.z.string().optional(),
                startTime: zod_1.z.string().optional(),
                endTime: zod_1.z.string().optional(),
                status: zod_1.z.enum(["AVAILABLE", "BUSY", "OFF_DUTY"]).optional(),
                notes: zod_1.z.string().optional(),
            });
            const validatedData = updateSchema.parse(req.body);
            // Método não implementado no service
            return res.status(501).json({
                success: false,
                message: "Atualização de disponibilidade não implementada ainda",
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos",
                    errors: error.issues,
                });
            }
            console.error("Erro ao atualizar disponibilidade:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao atualizar disponibilidade",
            });
        }
    }
    async deleteAvailability(req, res) {
        try {
            const { id } = req.params;
            // Método não implementado no service
            return res.status(501).json({
                success: false,
                message: "Remoção de disponibilidade não implementada ainda",
            });
        }
        catch (error) {
            console.error("Erro ao remover disponibilidade:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao remover disponibilidade",
            });
        }
    }
    async getCollaboratorAvailabilities(req, res) {
        try {
            const { collaboratorId } = req.params;
            // Método não implementado no service - retorna array vazio
            const availabilities = await collaboratorService.getCollaboratorAvailabilities();
            return res.json({
                success: true,
                data: availabilities,
            });
        }
        catch (error) {
            console.error("Erro ao buscar disponibilidades do colaborador:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar disponibilidades do colaborador",
            });
        }
    }
    // Gerenciamento de Pagamentos
    async getAllPayments(req, res) {
        try {
            const payments = await collaboratorService.getAllPayments();
            return res.json({
                success: true,
                data: payments,
            });
        }
        catch (error) {
            console.error("Erro ao buscar pagamentos:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar pagamentos",
            });
        }
    }
    async createPayment(req, res) {
        try {
            const paymentSchema = zod_1.z.object({
                collaboratorId: zod_1.z.string().uuid("ID do colaborador inválido"),
                eventId: zod_1.z.string().uuid("ID do evento inválido").optional(),
                amount: zod_1.z.number().min(0, "Valor deve ser positivo"),
                type: zod_1.z.enum(["HOURLY", "FIXED", "COMMISSION", "BONUS", "DEDUCTION"]),
                description: zod_1.z.string().optional(),
                paymentDate: zod_1.z.string().min(1, "Data de pagamento é obrigatória"),
                status: zod_1.z.enum(["PENDING", "PAID", "CANCELLED"]).default("PENDING"),
                notes: zod_1.z.string().optional(),
            });
            const validatedData = paymentSchema.parse(req.body);
            // Usar createPaymentRecord em vez de createPayment
            const payment = await collaboratorService.createPaymentRecord({
                collaboratorId: validatedData.collaboratorId,
                eventId: validatedData.eventId,
                amount: validatedData.amount,
                type: validatedData.type,
                description: validatedData.description || "Pagamento manual",
                dueDate: validatedData.paymentDate,
                notes: validatedData.notes,
            });
            return res.status(201).json({
                success: true,
                data: payment,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos",
                    errors: error.issues,
                });
            }
            console.error("Erro ao criar pagamento:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao criar pagamento",
            });
        }
    }
    async updatePayment(req, res) {
        try {
            const { id } = req.params;
            const updateSchema = zod_1.z.object({
                amount: zod_1.z.number().min(0).optional(),
                description: zod_1.z.string().optional(),
                paymentDate: zod_1.z.string().optional(),
                status: zod_1.z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
                notes: zod_1.z.string().optional(),
            });
            const validatedData = updateSchema.parse(req.body);
            if (!id) {
                return res.status(400).json({ success: false, message: 'ID do pagamento é obrigatório' });
            }
            // Autorização: apenas ADMIN ou (possivelmente) o próprio colaborador - aqui permitimos ADMIN
            if (req.userRole !== 'ADMIN') {
                return res.status(403).json({ success: false, message: 'Acesso negado' });
            }
            const updated = await collaboratorService.updatePayment(id, validatedData);
            return res.json({ success: true, data: updated });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos",
                    errors: error.issues,
                });
            }
            console.error("Erro ao atualizar pagamento:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao atualizar pagamento",
            });
        }
    }
    async deletePayment(req, res) {
        try {
            const { id } = req.params;
            // Método não implementado no service
            return res.status(501).json({
                success: false,
                message: "Remoção de pagamento não implementada ainda",
            });
        }
        catch (error) {
            console.error("Erro ao remover pagamento:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao remover pagamento",
            });
        }
    }
    async getCollaboratorPayments(req, res) {
        try {
            const { collaboratorId } = req.params;
            // Método não implementado no service - retorna array vazio
            const payments = await collaboratorService.getCollaboratorPayments();
            return res.json({
                success: true,
                data: payments,
            });
        }
        catch (error) {
            console.error("Erro ao buscar pagamentos do colaborador:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar pagamentos do colaborador",
            });
        }
    }
    async getPaymentStats(req, res) {
        try {
            const { collaboratorId } = req.params;
            // Método não implementado no service - retorna stats padrão
            const stats = await collaboratorService.getPaymentStats();
            return res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            console.error("Erro ao buscar estatísticas de pagamentos:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar estatísticas de pagamentos",
            });
        }
    }
    // Buscar todos os event collaborators (para o contexto frontend)
    async getAllEventCollaborators(req, res) {
        try {
            // Por enquanto, retornar array vazio até implementar no repository
            const eventCollaborators = [];
            return res.json({
                success: true,
                data: eventCollaborators,
            });
        }
        catch (error) {
            console.error("Erro ao buscar todos os event collaborators:", error);
            return res.status(500).json({
                success: false,
                message: "Erro ao buscar event collaborators",
            });
        }
    }
}
exports.CollaboratorController = CollaboratorController;
// Instância única do controller
const collaboratorController = new CollaboratorController();
// Exportar métodos do controller
exports.createCollaborator = collaboratorController.createCollaborator, exports.getAllCollaborators = collaboratorController.getAllCollaborators, exports.getCollaboratorById = collaboratorController.getCollaboratorById, exports.updateCollaborator = collaboratorController.updateCollaborator, exports.deleteCollaborator = collaboratorController.deleteCollaborator, exports.assignCollaboratorToEvent = collaboratorController.assignCollaboratorToEvent, exports.getAllEventCollaborators = collaboratorController.getAllEventCollaborators, exports.getEventCollaborators = collaboratorController.getEventCollaborators, exports.getCollaboratorEvents = collaboratorController.getCollaboratorEvents, exports.updateEventCollaborator = collaboratorController.updateEventCollaborator, exports.removeCollaboratorFromEvent = collaboratorController.removeCollaboratorFromEvent, exports.searchCollaborators = collaboratorController.searchCollaborators, exports.getCollaboratorStats = collaboratorController.getCollaboratorStats, exports.getMyDashboard = collaboratorController.getMyDashboard, exports.getAvailableCollaborators = collaboratorController.getAvailableCollaborators, exports.getAllAvailabilities = collaboratorController.getAllAvailabilities, exports.createAvailability = collaboratorController.createAvailability, exports.updateAvailability = collaboratorController.updateAvailability, exports.deleteAvailability = collaboratorController.deleteAvailability, exports.getCollaboratorAvailabilities = collaboratorController.getCollaboratorAvailabilities, exports.getAllPayments = collaboratorController.getAllPayments, exports.createPayment = collaboratorController.createPayment, exports.updatePayment = collaboratorController.updatePayment, exports.deletePayment = collaboratorController.deletePayment, exports.getCollaboratorPayments = collaboratorController.getCollaboratorPayments, exports.getPaymentStats = collaboratorController.getPaymentStats;
// Alias para createEventCollaborator
exports.createEventCollaborator = exports.assignCollaboratorToEvent;

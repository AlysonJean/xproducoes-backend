"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteController = void 0;
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../config/logger"));
// Validação para criação de quote
const createQuoteSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nome é obrigatório"),
    email: zod_1.z.string().email("Email inválido"),
    phone: zod_1.z.string().optional(),
    company: zod_1.z.string().optional(),
    eventType: zod_1.z.string().min(1, "Tipo de evento é obrigatório"),
    eventDate: zod_1.z.string().min(1, "Data do evento é obrigatória"),
    location: zod_1.z.string().min(1, "Local é obrigatório"),
    description: zod_1.z.string().min(1, "Descrição é obrigatória"),
    equipment: zod_1.z.array(zod_1.z.string()).optional(),
    budget: zod_1.z.string().optional(),
});
// Validação para atualização de status
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["pending", "in_review", "approved", "rejected", "expired"]),
});
// Validação para resposta ao quote
const respondSchema = zod_1.z.object({
    message: zod_1.z.string().min(1, "Mensagem é obrigatória"),
    price: zod_1.z.number().positive("Preço deve ser positivo").optional(),
    details: zod_1.z.string().optional(),
    validUntil: zod_1.z.string().optional(),
});
class QuoteController {
    /**
     * Submeter novo quote
     */
    async submit(req, res) {
        try {
            const validatedData = createQuoteSchema.parse(req.body);
            // Simular armazenamento (substituir por implementação real)
            const quote = {
                id: `quote_${Date.now()}`,
                ...validatedData,
                status: "pending",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            logger_1.default.info("Quote submitted: " + JSON.stringify({ quoteId: quote.id, email: validatedData.email, eventType: validatedData.eventType }));
            res.status(201).json({
                success: true,
                message: "Quote submitted successfully",
                data: quote,
            });
        }
        catch (error) {
            logger_1.default.error("Error submitting quote: " + String(error));
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: "Validation error",
                    errors: error.issues,
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    /**
     * Listar todos os quotes (admin)
     */
    async getAll(req, res) {
        try {
            // Simular busca (substituir por implementação real)
            const quotes = [
                {
                    id: "quote_1",
                    name: "João Silva",
                    email: "joao@example.com",
                    eventType: "Casamento",
                    eventDate: "2024-06-15",
                    status: "pending",
                    createdAt: "2024-01-15T10:00:00Z",
                },
            ];
            res.json({
                success: true,
                data: quotes,
                total: quotes.length,
            });
        }
        catch (error) {
            logger_1.default.error("Error fetching quotes: " + String(error));
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    /**
     * Buscar quote por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            // Simular busca (substituir por implementação real)
            const quote = {
                id,
                name: "João Silva",
                email: "joao@example.com",
                phone: "(11) 99999-9999",
                company: "Empresa XYZ",
                eventType: "Casamento",
                eventDate: "2024-06-15",
                location: "São Paulo, SP",
                description: "Casamento com 150 convidados",
                equipment: ["camera1", "lens1", "light1"],
                budget: "R$ 5.000",
                status: "pending",
                createdAt: "2024-01-15T10:00:00Z",
                updatedAt: "2024-01-15T10:00:00Z",
            };
            if (!quote) {
                res.status(404).json({
                    success: false,
                    message: "Quote not found",
                });
                return;
            }
            res.json({
                success: true,
                data: quote,
            });
        }
        catch (error) {
            logger_1.default.error("Error fetching quote: " + JSON.stringify({ error: String(error), quoteId: req.params.id }));
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    /**
     * Atualizar status do quote
     */
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = updateStatusSchema.parse(req.body);
            // Simular atualização (substituir por implementação real)
            const updatedQuote = {
                id,
                status,
                updatedAt: new Date().toISOString(),
            };
            logger_1.default.info("Quote status updated: " + JSON.stringify({ quoteId: id, newStatus: status, updatedBy: req.user?.id }));
            res.json({
                success: true,
                message: "Quote status updated successfully",
                data: updatedQuote,
            });
        }
        catch (error) {
            logger_1.default.error("Error updating quote status: " + JSON.stringify({ error: String(error), quoteId: req.params.id }));
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: "Validation error",
                    errors: error.issues,
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    /**
     * Responder ao quote
     */
    async respond(req, res) {
        try {
            const { id } = req.params;
            const validatedData = respondSchema.parse(req.body);
            // Simular resposta (substituir por implementação real)
            const response = {
                id: `response_${Date.now()}`,
                quoteId: id,
                ...validatedData,
                respondedBy: req.user?.id,
                respondedAt: new Date().toISOString(),
            };
            logger_1.default.info("Quote response sent: " + JSON.stringify({ quoteId: id, responseId: response.id, respondedBy: req.user?.id }));
            res.json({
                success: true,
                message: "Response sent successfully",
                data: response,
            });
        }
        catch (error) {
            logger_1.default.error("Error responding to quote: " + JSON.stringify({ error: String(error), quoteId: req.params.id }));
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: "Validation error",
                    errors: error.issues,
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
}
exports.QuoteController = QuoteController;

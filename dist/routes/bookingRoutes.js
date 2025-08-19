"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middlewares/auth");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const router = (0, express_1.Router)();
const bookingController = new bookingController_1.BookingController();
// Todas as rotas requerem autenticação
router.use(auth_1.authenticate);
// Rotas públicas (qualquer usuário autenticado)
router.get("/user", bookingController.findByUser); // Reservas do usuário logado
router.get("/upcoming", bookingController.getUpcoming); // Próximas reservas
router.get("/history", bookingController.getHistory); // Histórico de reservas
router.get("/calendar", bookingController.getCalendar); // Calendário de eventos
router.post("/", bookingController.create); // Criar nova reserva
router.get("/:id", bookingController.findOne); // Buscar reserva específica
router.put("/:id", bookingController.update); // Atualizar reserva
router.delete("/:id", bookingController.delete); // Deletar reserva
router.put("/:id/confirm", bookingController.confirm); // Confirmar reserva
router.put("/:id/cancel", bookingController.cancel); // Cancelar reserva
// Confirmar com detalhes (preço acordado e atribuição de colaboradores) - apenas ADMIN
router.put("/:id/confirm-details", (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), bookingController.confirmWithDetails);
// Rotas administrativas (apenas para administradores)
router.get("/", (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), bookingController.findAll); // Todas as reservas
router.put("/:id/status", (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), bookingController.updateStatus); // Atualizar status
router.put("/:id/delivery-status", (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), bookingController.updateDeliveryStatus); // Atualizar status entrega
router.get("/calendar/events", (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), bookingController.getCalendarBookings); // Eventos do calendário
router.get("/dashboard/stats", (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), bookingController.getDashboardStats); // Estatísticas
// Attachments (comprovantes)
router.post('/:id/attachments', bookingController.addAttachment);
router.delete('/:id/attachments/:attachmentId', bookingController.removeAttachment);
// Rotas específicas de colaboradores (futuro)
router.get("/collaborator/:collaboratorId/events", (0, roleMiddleware_1.roleMiddleware)(["ADMIN", "COLLABORATOR"]), bookingController.getCollaboratorEvents);
exports.default = router;

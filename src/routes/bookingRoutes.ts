import { Router } from "express";
import { BookingController } from "../controllers/bookingController";
import { criticalEndpointRateLimit } from '../middlewares/rateLimitMiddleware';
import { validateJsonContentType } from "../middlewares/contentTypeValidation";
import { authenticate, adminOnly, adminOrCollaborator } from "../middlewares/unifiedAuth";

const router = Router();
const bookingController = new BookingController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas públicas (qualquer usuário autenticado)
router.get("/user", bookingController.findByUser); // Reservas do usuário logado
router.get("/upcoming", bookingController.getUpcoming); // Próximas reservas
router.get("/history", bookingController.getHistory); // Histórico de reservas
router.get("/calendar", bookingController.getCalendar); // Calendário de eventos
router.post("/", validateJsonContentType, criticalEndpointRateLimit, bookingController.create); // Criar nova reserva
router.get("/:id", bookingController.findOne); // Buscar reserva específica
router.put("/:id", validateJsonContentType, bookingController.update); // Atualizar reserva
router.delete("/:id", bookingController.delete); // Deletar reserva
router.put("/:id/confirm", bookingController.confirm); // Confirmar reserva
router.put("/:id/cancel", bookingController.cancel); // Cancelar reserva
	// Confirmar com detalhes (preço acordado e atribuição de colaboradores) - apenas ADMIN
	router.put("/:id/confirm-details", adminOnly, bookingController.confirmWithDetails);

// Rotas administrativas (apenas para administradores)
router.get("/", adminOnly, bookingController.findAll); // Todas as reservas
router.put("/:id/status", adminOnly, bookingController.updateStatus); // Atualizar status
router.put("/:id/delivery-status", adminOnly, bookingController.updateDeliveryStatus); // Atualizar status entrega
router.get("/calendar/events", adminOnly, bookingController.getCalendarBookings); // Eventos do calendário
router.get("/dashboard/stats", adminOnly, bookingController.getDashboardStats); // Estatísticas

// Attachments (comprovantes)
router.post('/:id/attachments', bookingController.addAttachment);
router.delete('/:id/attachments/:attachmentId', bookingController.removeAttachment);

// Rotas específicas de colaboradores (futuro)
router.get("/collaborator/:collaboratorId/events", adminOrCollaborator, bookingController.getCollaboratorEvents);

export default router;

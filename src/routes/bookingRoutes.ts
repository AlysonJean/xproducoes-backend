import { createSafeRouter } from "../middlewares/safeRouter";
import { BookingController } from "../controllers/bookingController";
import { criticalEndpointRateLimit } from '../middlewares/rateLimitMiddleware';
import { validateJsonContentType } from "../middlewares/contentTypeValidation";
import { authenticate, adminOnly, adminOrCollaborator } from "../middlewares/unifiedAuth";
import { validateBody, validateId } from "../config/validation";
import { 
  bookingCreateSchema, 
  bookingUpdateSchema, 
  bookingStatusUpdateSchema,
  deliveryStatusUpdateSchema,
  bookingCancelSchema 
} from "../validators/bookingSchema";

const router = createSafeRouter();
const bookingController = new BookingController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas públicas (qualquer usuário autenticado)
router.get("/me", bookingController.findByUser);
router.get("/user", bookingController.findByUser);
router.get("/upcoming", bookingController.getUpcoming);
router.get("/history", bookingController.getHistory);
router.get("/calendar", bookingController.getCalendar);
router.post("/", validateJsonContentType, criticalEndpointRateLimit, validateBody(bookingCreateSchema), bookingController.create);
router.get("/:id", validateId(), bookingController.findOne);
router.put("/:id", validateId(), validateJsonContentType, validateBody(bookingUpdateSchema), bookingController.update);
router.delete("/:id", validateId(), bookingController.delete);
router.put("/:id/confirm", validateId(), bookingController.confirm);
router.put("/:id/cancel", validateId(), validateJsonContentType, validateBody(bookingCancelSchema), bookingController.cancel);
	// Confirmar com detalhes (preço acordado e atribuição de colaboradores) - apenas ADMIN
	router.put("/:id/confirm-details", adminOnly, validateId(), bookingController.confirmWithDetails);

// Rotas administrativas (apenas para administradores)
router.get("/", adminOnly, bookingController.findAll);
router.put("/:id/status", adminOnly, validateId(), validateJsonContentType, validateBody(bookingStatusUpdateSchema), bookingController.updateStatus);
router.put("/:id/delivery-status", adminOnly, validateId(), validateJsonContentType, validateBody(deliveryStatusUpdateSchema), bookingController.updateDeliveryStatus);
router.get("/calendar/events", adminOnly, bookingController.getCalendarBookings);
router.get("/dashboard/stats", adminOnly, bookingController.getDashboardStats);

// Attachments (comprovantes)
router.post('/:id/attachments', validateId(), bookingController.addAttachment);
router.delete('/:id/attachments/:attachmentId', validateId(), bookingController.removeAttachment);

// Checklist e Despesas (Crew Experience)
router.get("/roadmap/:id", adminOrCollaborator, validateId(), bookingController.getRoadmap);
router.post("/:id/tasks", adminOnly, validateId(), validateJsonContentType, bookingController.createTask);
router.put("/tasks/:taskId/toggle", adminOrCollaborator, bookingController.toggleTask);
router.post("/:id/expenses", adminOrCollaborator, bookingController.addExpense);

export default router;

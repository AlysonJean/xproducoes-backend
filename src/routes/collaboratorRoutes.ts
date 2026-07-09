import { createSafeRouter } from "../middlewares/safeRouter";
import {
  createCollaborator,
  getAllCollaborators,
  getCollaboratorById,
  updateCollaborator,
  deleteCollaborator,
  assignCollaboratorToEvent,
  getEventCollaborators,
  getCollaboratorEvents,
  updateEventCollaborator,
  removeCollaboratorFromEvent,
  searchCollaborators,
  getCollaboratorStats,
  getMyDashboard,
  getMyProfile,
  updateMyProfile,
  getMyAvailability, // Novo
  getMyPayments, // Novo
  getMyStats, // Novo
  getMyEvents, // Novo
  getMyNotifications, // Novo
  getCollaboratorAvailabilities,
  getAvailableCollaborators,
  getAllAvailabilities,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getAllPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getCollaboratorPayments,
  getPaymentStats,
  getAllEventCollaborators,
} from "../controllers/collaboratorController";
import { sendInvite } from '../controllers/inviteController';
import { authenticate, requireAdminOrCollaborator, adminOnly } from "../middlewares/unifiedAuth";
import { validateBody, validateId } from "../config/validation";
import { 
  collaboratorCreateSchema, 
  collaboratorUpdateSchema, 
  inviteCreateSchema, 
  availabilityCreateSchema, 
  availabilityUpdateSchema, 
  paymentCreateSchema, 
  paymentUpdateSchema,
  eventAssignmentSchema,
  eventAssignmentUpdateSchema 
} from "../schemas/collaborator.schema";

const router = createSafeRouter();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de CRUD de Colaboradores (apenas admin)
router.post("/", adminOnly, validateBody(collaboratorCreateSchema), createCollaborator);
// Rota para enviar convite por email
router.post('/invite', adminOnly, validateBody(inviteCreateSchema), sendInvite);
router.get("/", getAllCollaborators);
router.get("/search", searchCollaborators);
router.get("/available", getAvailableCollaborators);

// --- Rotas /me/ (DEVEM vir antes de /:id) ---
// Dashboard do colaborador (me)
router.get('/me/dashboard', requireAdminOrCollaborator, getMyDashboard);
// Perfil do colaborador (me)
router.get('/me/profile', requireAdminOrCollaborator, getMyProfile);
router.put('/me/profile', requireAdminOrCollaborator, validateBody(collaboratorUpdateSchema), updateMyProfile);
// Rotas ME adicionais
router.get('/me/availability', requireAdminOrCollaborator, getMyAvailability);
router.post('/me/availability', requireAdminOrCollaborator, validateBody(availabilityCreateSchema), createAvailability);
router.put('/me/availability', requireAdminOrCollaborator, validateBody(availabilityCreateSchema), createAvailability);
router.get('/me/payments', requireAdminOrCollaborator, getMyPayments);
router.get('/me/stats', requireAdminOrCollaborator, getMyStats);
router.get('/me/events', requireAdminOrCollaborator, getMyEvents);
router.get('/me/notifications', requireAdminOrCollaborator, getMyNotifications);
// ---------------------------------------------

router.get("/:id", validateId(), getCollaboratorById);
router.put("/:id", adminOnly, validateId(), validateBody(collaboratorUpdateSchema), updateCollaborator);
router.delete("/:id", adminOnly, validateId(), deleteCollaborator);

// Rotas de estatísticas (dados operacionais internos: staff apenas, não CLIENT)
router.get("/:id/stats", requireAdminOrCollaborator, getCollaboratorStats);
router.get("/:collaboratorId/events", requireAdminOrCollaborator, getCollaboratorEvents);

// Rotas de disponibilidades (CRUD genérico)
router.post("/availabilities", adminOnly, createAvailability);
router.get("/events/:eventId/collaborators", requireAdminOrCollaborator, getEventCollaborators); // validateId('eventId')?
router.post("/event-assignments", adminOnly, validateBody(eventAssignmentSchema), assignCollaboratorToEvent);
router.put("/event-assignments/:id", adminOnly, validateId(), validateBody(eventAssignmentUpdateSchema), updateEventCollaborator);
router.delete(
  "/event-assignments/:id",
  adminOnly,
  removeCollaboratorFromEvent,
);

// Rotas de disponibilidades
router.get("/availabilities", requireAdminOrCollaborator, getAllAvailabilities);
router.post("/availabilities", adminOnly, validateBody(availabilityCreateSchema), createAvailability);
router.put("/availabilities/:id", adminOnly, validateId(), validateBody(availabilityUpdateSchema), updateAvailability);
router.delete("/availabilities/:id", adminOnly, validateId(), deleteAvailability);
router.get("/:collaboratorId/availabilities", requireAdminOrCollaborator, getCollaboratorAvailabilities);

// Rotas de Pagamentos
router.get("/payments/all", adminOnly, getAllPayments);
router.get("/payments/stats", adminOnly, getPaymentStats);
router.post("/payments", adminOnly, validateBody(paymentCreateSchema), createPayment);
router.put("/payments/:id", adminOnly, validateId(), validateBody(paymentUpdateSchema), updatePayment);
router.delete("/payments/:id", adminOnly, validateId(), deletePayment);
router.get("/:collaboratorId/payments", adminOnly, getCollaboratorPayments);

// Rota global de atribuições
router.get("/event-assignments/all", adminOnly, getAllEventCollaborators);

export default router;

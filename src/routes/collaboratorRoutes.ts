import { Router, type Router as RouterType } from "express";
import {
  createCollaborator,
  // ...existing exports
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
  getAvailableCollaborators,
  getAllAvailabilities,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getCollaboratorAvailabilities,
} from "../controllers/collaboratorController";
import { sendInvite } from '../controllers/inviteController';
import { authenticate, requireAdminOrCollaborator } from "../middlewares/unifiedAuth";
import { ensureAdmin } from "../config/ensureAdmin";

const router: RouterType = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de CRUD de Colaboradores (apenas admin)
router.post("/", ensureAdmin, createCollaborator);
// Rota para enviar convite por email
router.post('/invite', ensureAdmin, sendInvite);
router.get("/", getAllCollaborators);
router.get("/search", searchCollaborators);
router.get("/available", getAvailableCollaborators);

// --- Rotas /me/ (DEVEM vir antes de /:id) ---
// Dashboard do colaborador (me)
router.get('/me/dashboard', requireAdminOrCollaborator, getMyDashboard);
// Perfil do colaborador (me)
router.get('/me/profile', requireAdminOrCollaborator, getMyProfile);
router.put('/me/profile', requireAdminOrCollaborator, updateMyProfile);
// Rotas ME adicionais
router.get('/me/availability', requireAdminOrCollaborator, getMyAvailability);
router.post('/me/availability', requireAdminOrCollaborator, createAvailability); // Suporta criação
router.put('/me/availability', requireAdminOrCollaborator, createAvailability); // Compatibilidade frontend (PUT agindo como create/upsert)
router.get('/me/payments', requireAdminOrCollaborator, getMyPayments);
router.get('/me/stats', requireAdminOrCollaborator, getMyStats);
router.get('/me/events', requireAdminOrCollaborator, getMyEvents);
router.get('/me/notifications', requireAdminOrCollaborator, getMyNotifications);
// ---------------------------------------------

router.get("/:id", getCollaboratorById);
router.put("/:id", ensureAdmin, updateCollaborator);
router.delete("/:id", ensureAdmin, deleteCollaborator);

// Rotas de estatísticas
router.get("/:id/stats", getCollaboratorStats);
router.get("/:collaboratorId/events", getCollaboratorEvents);

// Rotas de disponibilidades (CRUD genérico)
router.post("/availabilities", ensureAdmin, createAvailability);
router.get("/events/:eventId/collaborators", getEventCollaborators);
router.post("/event-assignments", ensureAdmin, assignCollaboratorToEvent); // Rota adicionada
router.put("/event-assignments/:id", ensureAdmin, updateEventCollaborator);
router.delete(
  "/event-assignments/:id",
  ensureAdmin,
  removeCollaboratorFromEvent,
);

// Rotas de disponibilidades
router.get("/availabilities", getAllAvailabilities);
router.post("/availabilities", ensureAdmin, createAvailability);
router.put("/availabilities/:id", ensureAdmin, updateAvailability);
router.delete("/availabilities/:id", ensureAdmin, deleteAvailability);
router.get("/:collaboratorId/availabilities", getCollaboratorAvailabilities);

export default router;

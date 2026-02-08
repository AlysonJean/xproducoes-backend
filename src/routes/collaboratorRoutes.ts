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
import { authenticate, requireAdminOrCollaborator, adminOnly } from "../middlewares/unifiedAuth";

const router: RouterType = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de CRUD de Colaboradores (apenas admin)
router.post("/", adminOnly, createCollaborator);
// Rota para enviar convite por email
router.post('/invite', adminOnly, sendInvite);
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
router.put("/:id", adminOnly, updateCollaborator);
router.delete("/:id", adminOnly, deleteCollaborator);

// Rotas de estatísticas
router.get("/:id/stats", getCollaboratorStats);
router.get("/:collaboratorId/events", getCollaboratorEvents);

// Rotas de disponibilidades (CRUD genérico)
router.post("/availabilities", adminOnly, createAvailability);
router.get("/events/:eventId/collaborators", getEventCollaborators);
router.post("/event-assignments", adminOnly, assignCollaboratorToEvent); // Rota adicionada
router.put("/event-assignments/:id", adminOnly, updateEventCollaborator);
router.delete(
  "/event-assignments/:id",
  adminOnly,
  removeCollaboratorFromEvent,
);

// Rotas de disponibilidades
router.get("/availabilities", getAllAvailabilities);
router.post("/availabilities", adminOnly, createAvailability);
router.put("/availabilities/:id", adminOnly, updateAvailability);
router.delete("/availabilities/:id", adminOnly, deleteAvailability);
router.get("/:collaboratorId/availabilities", getCollaboratorAvailabilities);

export default router;

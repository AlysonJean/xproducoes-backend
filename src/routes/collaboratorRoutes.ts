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
  getAvailableCollaborators,
  getAllAvailabilities,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getCollaboratorAvailabilities,
} from "../controllers/collaboratorController";
import { sendInvite } from '../controllers/inviteController';
import { authMiddleware, adminOrCollaborator } from "../middlewares/authMiddleware";
import { ensureAdmin } from "../config/ensureAdmin";

const router: RouterType = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas de CRUD de Colaboradores (apenas admin)
router.post("/", ensureAdmin, createCollaborator);
// Rota para enviar convite por email
router.post('/invite', ensureAdmin, sendInvite);
router.get("/", getAllCollaborators);
router.get("/search", searchCollaborators);
router.get("/available", getAvailableCollaborators);
router.get("/:id", getCollaboratorById);
router.put("/:id", ensureAdmin, updateCollaborator);
router.delete("/:id", ensureAdmin, deleteCollaborator);

// Rotas de estatísticas
router.get("/:id/stats", getCollaboratorStats);
router.get("/:collaboratorId/events", getCollaboratorEvents);
// Dashboard do colaborador (me)
router.get('/me/dashboard', adminOrCollaborator, getMyDashboard);
// Perfil do colaborador (me)
router.get('/me/profile', adminOrCollaborator, getMyProfile);
router.put('/me/profile', adminOrCollaborator, updateMyProfile);

// Rotas de gestão de eventos
router.post("/event-assignments", ensureAdmin, assignCollaboratorToEvent);
router.get("/events/:eventId/collaborators", getEventCollaborators);
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

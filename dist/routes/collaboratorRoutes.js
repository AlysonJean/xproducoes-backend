"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const collaboratorController_1 = require("../controllers/collaboratorController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const ensureAdmin_1 = require("../config/ensureAdmin");
const router = (0, express_1.Router)();
// Todas as rotas requerem autenticação
router.use(authMiddleware_1.authMiddleware);
// Rotas de CRUD de Colaboradores (apenas admin)
router.post("/", ensureAdmin_1.ensureAdmin, collaboratorController_1.createCollaborator);
router.get("/", collaboratorController_1.getAllCollaborators);
router.get("/search", collaboratorController_1.searchCollaborators);
router.get("/available", collaboratorController_1.getAvailableCollaborators);
router.get("/:id", collaboratorController_1.getCollaboratorById);
router.put("/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.updateCollaborator);
router.delete("/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.deleteCollaborator);
// Rotas de estatísticas
router.get("/:id/stats", collaboratorController_1.getCollaboratorStats);
router.get("/:collaboratorId/events", collaboratorController_1.getCollaboratorEvents);
// Dashboard do colaborador (me)
router.get('/me/dashboard', authMiddleware_1.adminOrCollaborator, collaboratorController_1.getMyDashboard);
// Rotas de gestão de eventos
router.post("/event-assignments", ensureAdmin_1.ensureAdmin, collaboratorController_1.assignCollaboratorToEvent);
router.get("/events/:eventId/collaborators", collaboratorController_1.getEventCollaborators);
router.put("/event-assignments/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.updateEventCollaborator);
router.delete("/event-assignments/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.removeCollaboratorFromEvent);
// Rotas de disponibilidades
router.get("/availabilities", collaboratorController_1.getAllAvailabilities);
router.post("/availabilities", ensureAdmin_1.ensureAdmin, collaboratorController_1.createAvailability);
router.put("/availabilities/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.updateAvailability);
router.delete("/availabilities/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.deleteAvailability);
router.get("/:collaboratorId/availabilities", collaboratorController_1.getCollaboratorAvailabilities);
exports.default = router;

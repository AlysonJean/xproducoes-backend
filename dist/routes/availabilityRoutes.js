"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const collaboratorController_1 = require("../controllers/collaboratorController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const ensureAdmin_1 = require("../config/ensureAdmin");
const router = (0, express_1.Router)();
// Todas as rotas requerem autenticação
router.use(authMiddleware_1.authMiddleware);
// Rotas de disponibilidades
router.get("/", collaboratorController_1.getAllAvailabilities);
router.post("/", ensureAdmin_1.ensureAdmin, collaboratorController_1.createAvailability);
router.put("/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.updateAvailability);
router.delete("/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.deleteAvailability);
// Rota para buscar disponibilidades de um colaborador específico
router.get("/collaborator/:collaboratorId", collaboratorController_1.getCollaboratorAvailabilities);
exports.default = router;

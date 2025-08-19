"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const collaboratorController_1 = require("../controllers/collaboratorController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Todas as rotas requerem autenticação
router.use(authMiddleware_1.authMiddleware);
// Rota para buscar todos os event collaborators
router.get("/", collaboratorController_1.getAllEventCollaborators);
// Rota para criar uma nova atribuição de colaborador a evento
router.post("/", collaboratorController_1.createEventCollaborator);
exports.default = router;

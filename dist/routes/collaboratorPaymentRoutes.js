"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const collaboratorController_1 = require("../controllers/collaboratorController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const ensureAdmin_1 = require("../config/ensureAdmin");
const router = (0, express_1.Router)();
// Todas as rotas requerem autenticação
router.use(authMiddleware_1.authMiddleware);
// Rotas de pagamentos de colaboradores
router.get("/", collaboratorController_1.getAllPayments);
router.post("/", ensureAdmin_1.ensureAdmin, collaboratorController_1.createPayment);
router.put("/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.updatePayment);
router.delete("/:id", ensureAdmin_1.ensureAdmin, collaboratorController_1.deletePayment);
// Rotas para buscar pagamentos e estatísticas de um colaborador específico
router.get("/collaborator/:collaboratorId", collaboratorController_1.getCollaboratorPayments);
router.get("/collaborator/:collaboratorId/stats", collaboratorController_1.getPaymentStats);
exports.default = express_1.Router;

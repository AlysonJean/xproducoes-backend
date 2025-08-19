"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Todas as rotas de perfil requerem autenticação
router.use(auth_1.authenticate);
// Rotas de perfil geral
router.get("/profile", profileController_1.profileController.getProfile);
router.put("/profile", profileController_1.profileController.updateProfile);
// Rotas de colaboradores
router.get("/collaborators", profileController_1.profileController.getCollaborators);
router.get("/collaborators/:id", profileController_1.profileController.getCollaboratorDetails);
router.put("/collaborator/profile", profileController_1.profileController.updateCollaboratorProfile);
router.post("/collaborator/portfolio", profileController_1.profileController.addPortfolioItem);
// Rotas de clientes
router.get("/clients", profileController_1.profileController.getClients);
router.put("/client/profile", profileController_1.profileController.updateClientProfile);
exports.default = router;

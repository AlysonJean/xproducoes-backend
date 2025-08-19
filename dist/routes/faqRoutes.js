"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const faqController_1 = require("../controllers/faqController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const faqRoutes = (0, express_1.Router)();
const faqController = new faqController_1.FaqController();
// Rota pública para qualquer visitante ver o FAQ
faqRoutes.get("/", faqController.findAll);
// Alias para compatibilidade REST/testes
faqRoutes.get("/faq", faqController.findAll);
// Rotas de Admin para gerir o FAQ
faqRoutes.post("/", authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), faqController.create);
faqRoutes.put("/:id", authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), faqController.update);
faqRoutes.delete("/:id", authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), faqController.delete);
exports.default = faqRoutes;

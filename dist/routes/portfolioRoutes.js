"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const portfolioController_1 = require("../controllers/portfolioController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const upload_1 = require("../middlewares/upload");
const portfolioRoutes = (0, express_1.Router)();
const portfolioController = new portfolioController_1.PortfolioController();
// Rota pública para qualquer visitante ver o portfólio
portfolioRoutes.get("/", portfolioController.findAll);
// Alias para compatibilidade REST/testes
portfolioRoutes.get("/portfolio", portfolioController.findAll);
// Rotas de Admin para gerir o portfólio
portfolioRoutes.post("/", authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), (0, upload_1.uploadSingle)("image"), require("../middlewares/upload").processUpload, portfolioController.create);
portfolioRoutes.put("/:id", authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), (0, upload_1.uploadSingle)("image"), require("../middlewares/upload").processUpload, portfolioController.update);
portfolioRoutes.delete("/:id", authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(["ADMIN"]), portfolioController.delete);
exports.default = portfolioRoutes;

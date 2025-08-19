"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quoteController_1 = require("../controllers/quoteController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const quoteController = new quoteController_1.QuoteController();
// Rota pública para submeter quote
router.post("/", quoteController.submit.bind(quoteController));
// Rotas protegidas (admin)
router.get("/", authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly, quoteController.getAll.bind(quoteController));
router.get("/:id", authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly, quoteController.getById.bind(quoteController));
router.patch("/:id/status", authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly, quoteController.updateStatus.bind(quoteController));
router.post("/:id/respond", authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly, quoteController.respond.bind(quoteController));
exports.default = router;

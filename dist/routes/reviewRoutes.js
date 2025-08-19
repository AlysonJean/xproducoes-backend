"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reviewController_1 = require("../controllers/reviewController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const reviewRoutes = (0, express_1.Router)();
const reviewController = new reviewController_1.ReviewController();
// Rotas públicas
reviewRoutes.get("/", reviewController.getAll);
// Alias para compatibilidade REST/testes
reviewRoutes.get("/reviews", reviewController.getAll);
reviewRoutes.get("/public", reviewController.getPublicReviews);
reviewRoutes.get("/equipment/:equipmentId", reviewController.getByEquipment);
reviewRoutes.get("/stats", reviewController.getStats);
reviewRoutes.get("/recent", reviewController.getRecent);
// Rotas protegidas
reviewRoutes.post("/", authMiddleware_1.authMiddleware, reviewController.create);
reviewRoutes.get("/user/:userId", authMiddleware_1.authMiddleware, reviewController.getByUser);
reviewRoutes.put("/:id", authMiddleware_1.authMiddleware, reviewController.update);
reviewRoutes.delete("/:id", authMiddleware_1.authMiddleware, reviewController.delete);
// Rotas administrativas
reviewRoutes.post("/:id/approve", authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly, reviewController.approve);
reviewRoutes.post("/:id/reject", authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly, reviewController.reject);
exports.default = reviewRoutes;

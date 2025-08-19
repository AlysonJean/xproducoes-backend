"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const equipmentController_1 = require("../controllers/equipmentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const cacheMiddleware_1 = require("../middlewares/cacheMiddleware");
const upload_1 = require("../middlewares/upload");
const equipmentRoutes = (0, express_1.Router)();
const equipmentController = new equipmentController_1.EquipmentController();
// --- Rotas Públicas (com cache otimizado) ---
equipmentRoutes.get("/search", cacheMiddleware_1.cacheMiddleware, equipmentController.search);
equipmentRoutes.get("/category/:categoryId", cacheMiddleware_1.cacheMiddleware, equipmentController.getByCategory);
equipmentRoutes.get("/", cacheMiddleware_1.cacheMiddleware, equipmentController.findAll);
equipmentRoutes.get("/:id", cacheMiddleware_1.cacheMiddleware, equipmentController.findOne); // 10 min
equipmentRoutes.get("/:id/availability", cacheMiddleware_1.cacheMiddleware, equipmentController.getAvailability); // 3 min
// Alias para plural (compatibilidade REST e testes)
equipmentRoutes.get("/equipments", cacheMiddleware_1.cacheMiddleware, equipmentController.findAll);
equipmentRoutes.get("/equipments/:id", cacheMiddleware_1.cacheMiddleware, equipmentController.findOne);
// --- Rotas de Admin (protegidas, sem cache) ---
equipmentRoutes.post("/", authMiddleware_1.authMiddleware, (0, upload_1.uploadSingle)("image"), require("../middlewares/upload").processUpload, equipmentController.create);
equipmentRoutes.put("/:id", authMiddleware_1.authMiddleware, (0, upload_1.uploadSingle)("image"), require("../middlewares/upload").processUpload, equipmentController.update);
equipmentRoutes.delete("/:id", authMiddleware_1.authMiddleware, equipmentController.delete);
exports.default = equipmentRoutes;

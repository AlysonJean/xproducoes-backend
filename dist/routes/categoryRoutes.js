"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoryController_1 = require("../controllers/categoryController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const ensureAdmin_1 = require("../config/ensureAdmin");
const categoryRoutes = (0, express_1.Router)();
const categoryController = new categoryController_1.CategoryController();
// Listar categorias pode ser público, mas as demais rotas são protegidas
categoryRoutes.get("/", categoryController.findAll);
// Alias para compatibilidade REST/testes
categoryRoutes.get("/categories", categoryController.findAll);
categoryRoutes.get("/with-counts", categoryController.getWithEquipmentCount);
categoryRoutes.get("/featured", categoryController.getFeatured);
categoryRoutes.get("/:id", categoryController.getById);
categoryRoutes.post("/", authMiddleware_1.authMiddleware, ensureAdmin_1.ensureAdmin, categoryController.create);
categoryRoutes.put("/:id", authMiddleware_1.authMiddleware, ensureAdmin_1.ensureAdmin, categoryController.update);
categoryRoutes.delete("/:id", authMiddleware_1.authMiddleware, ensureAdmin_1.ensureAdmin, categoryController.delete);
exports.default = categoryRoutes;

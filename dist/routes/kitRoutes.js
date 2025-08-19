"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kitController_1 = require("../controllers/kitController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const ensureAdmin_1 = require("../config/ensureAdmin");
const upload_1 = require("../middlewares/upload");
const kitRoutes = (0, express_1.Router)();
const kitController = new kitController_1.KitController();
// Rotas Públicas
kitRoutes.get("/", kitController.findAll);
// Alias para compatibilidade REST/testes
kitRoutes.get("/kits", kitController.findAll);
kitRoutes.get("/recommended", kitController.getRecommended);
kitRoutes.get("/popular", kitController.getPopular);
kitRoutes.get("/:id", kitController.findOne);
// Rotas de Admin com upload de imagem
kitRoutes.post("/", authMiddleware_1.authMiddleware, ensureAdmin_1.ensureAdmin, (0, upload_1.uploadSingle)("image"), require("../middlewares/upload").processUpload, kitController.create);
kitRoutes.put("/:id", authMiddleware_1.authMiddleware, ensureAdmin_1.ensureAdmin, (0, upload_1.uploadSingle)("image"), require("../middlewares/upload").processUpload, kitController.update);
kitRoutes.delete("/:id", authMiddleware_1.authMiddleware, ensureAdmin_1.ensureAdmin, kitController.delete);
exports.default = kitRoutes;

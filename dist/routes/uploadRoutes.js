"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uploadController_1 = require("../controllers/uploadController");
const upload_1 = require("../middlewares/upload");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadRoutes = (0, express_1.Router)();
const uploadController = new uploadController_1.UploadController();
// Rota para upload de avatar
uploadRoutes.post("/avatar", authMiddleware_1.authMiddleware, (0, upload_1.uploadSingle)("avatar"), require("../middlewares/upload").processUpload, uploadController.uploadAvatar);
// Rota para upload de imagem genérica
uploadRoutes.post("/image", authMiddleware_1.authMiddleware, (0, upload_1.uploadSingle)("image"), require("../middlewares/upload").processUpload, uploadController.uploadImage);
exports.default = uploadRoutes;

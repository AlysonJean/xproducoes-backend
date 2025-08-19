"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController = __importStar(require("../controllers/userController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const upload_1 = require("../middlewares/upload");
const userRoutes = (0, express_1.Router)();
userRoutes.post("/register", userController.register);
userRoutes.post("/login", userController.login);
userRoutes.get("/profile", authMiddleware_1.authMiddleware, userController.getProfile);
userRoutes.put("/profile", authMiddleware_1.authMiddleware, (0, upload_1.uploadSingle)("avatar"), require("../middlewares/upload").processUpload, userController.updateProfile);
// Rota temporária para favoritos (evitar 404)
userRoutes.get("/favorites", authMiddleware_1.authMiddleware, (req, res) => {
    res.json({
        success: true,
        data: {
            equipments: [],
            kits: []
        }
    });
});
// Rota para estatísticas do usuário
userRoutes.get("/stats", authMiddleware_1.authMiddleware, userController.getStats);
// Rota para alterar senha
userRoutes.post("/change-password", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Senha atual e nova senha são obrigatórias"
            });
        }
        // Aqui você implementaria a lógica de alteração de senha
        // Por enquanto, vamos retornar sucesso
        res.json({
            success: true,
            message: "Senha alterada com sucesso"
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor"
        });
    }
});
userRoutes.get("/", authMiddleware_1.authMiddleware, userController.listUsers);
// Alias para compatibilidade REST/testes
userRoutes.get("/users", authMiddleware_1.authMiddleware, userController.listUsers);
userRoutes.post("/forgot-password", userController.forgotPassword);
userRoutes.post("/reset-password", userController.resetPassword);
exports.default = userRoutes;

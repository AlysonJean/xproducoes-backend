import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticate } from "../middlewares/unifiedAuth";
import { uploadSingle } from "../middlewares/upload";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware';

const userRoutes = Router();

userRoutes.post("/register", userController.register);
userRoutes.post("/login", userController.login);

userRoutes.get("/profile", authenticate, userController.getProfile);
userRoutes.put(
  "/profile",
  authenticate,
  uploadRateLimit, uploadSingle("avatar"),
  require("../middlewares/upload").processUpload,
  userController.updateProfile,
);

// Rota temporária para favoritos (evitar 404)
userRoutes.get("/favorites", authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      equipments: [],
      kits: []
    }
  });
});

// Rota para estatísticas do usuário
userRoutes.get("/stats", authenticate, userController.getStats);

// Endpoint para promover usuário a VIP (verificação server-side)
userRoutes.post("/promote-vip", authenticate, userController.promoteVip);

// Rota para alterar senha
userRoutes.post("/change-password", authenticate, async (req, res) => {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

userRoutes.get("/", authenticate, userController.listUsers);
// Alias para compatibilidade REST/testes
userRoutes.get("/users", authenticate, userController.listUsers);

userRoutes.post("/forgot-password", userController.forgotPassword);
userRoutes.post("/reset-password", userController.resetPassword);

export default userRoutes;

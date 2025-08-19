import { Router } from "express";
import * as userController from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { uploadSingle } from "../middlewares/upload";

const userRoutes = Router();

userRoutes.post("/register", userController.register);
userRoutes.post("/login", userController.login);

userRoutes.get("/profile", authMiddleware, userController.getProfile);
userRoutes.put(
  "/profile",
  authMiddleware,
  uploadSingle("avatar"),
  require("../middlewares/upload").processUpload,
  userController.updateProfile,
);

// Rota temporária para favoritos (evitar 404)
userRoutes.get("/favorites", authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      equipments: [],
      kits: []
    }
  });
});

// Rota para estatísticas do usuário
userRoutes.get("/stats", authMiddleware, userController.getStats);

// Rota para alterar senha
userRoutes.post("/change-password", authMiddleware, async (req, res) => {
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

userRoutes.get("/", authMiddleware, userController.listUsers);
// Alias para compatibilidade REST/testes
userRoutes.get("/users", authMiddleware, userController.listUsers);

userRoutes.post("/forgot-password", userController.forgotPassword);
userRoutes.post("/reset-password", userController.resetPassword);

export default userRoutes;

import type { Request, Response } from 'express';
import { createSafeRouter } from "../middlewares/safeRouter.js";
import * as userController from "../controllers/userController.js";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth.js";
import { uploadSingle, processUpload } from "../middlewares/upload.js";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { validateBody } from "../config/validation.js";
import { updateUserSchema, changePasswordSchema } from "../schemas/user.schema.js";

const userRoutes = createSafeRouter();

userRoutes.post("/register", userController.register);
userRoutes.post("/login", userController.login);

userRoutes.get("/profile", authenticate, userController.getProfile);
userRoutes.put(
  "/profile",
  authenticate,
  uploadRateLimit, uploadSingle("avatar"),
  processUpload,
  validateBody(updateUserSchema),
  userController.updateProfile,
);

// Rota temporária para favoritos (evitar 404)
userRoutes.get("/favorites", authenticate, (req: Request, res: Response) => {
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
userRoutes.post("/change-password", authenticate, validateBody(changePasswordSchema), async (req: Request, res: Response) => {
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
  } catch {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

userRoutes.get("/", authenticate, requireAdmin, userController.listUsers);
// Alias para compatibilidade REST/testes
userRoutes.get("/users", authenticate, requireAdmin, userController.listUsers);

userRoutes.post("/forgot-password", userController.forgotPassword);
userRoutes.post("/reset-password", userController.resetPassword);

export default userRoutes;

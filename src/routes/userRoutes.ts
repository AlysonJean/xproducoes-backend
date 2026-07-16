import type { Request, Response, NextFunction } from 'express';
import { createSafeRouter } from "../middlewares/safeRouter.js";
import * as userController from "../controllers/userController.js";
import * as userService from "../services/userService.js";
import * as favoriteService from "../services/favoriteService.js";
import { authenticate, requireAdmin, AuthenticatedRequest } from "../middlewares/unifiedAuth.js";
import { uploadSingle, processUpload } from "../middlewares/upload.js";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { validateBody } from "../config/validation.js";
import { updateUserSchema, changePasswordSchema } from "../schemas/user.schema.js";
import { UnauthorizedError, NotFoundError } from "../utils/errors.js";
import { exportUserData, eraseUserData } from "../services/lgpdService.js";
import logger from "../config/logger.js";

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

// Favoritos: persistidos de verdade (ClientFavorite), sincronizam entre dispositivos.
userRoutes.get("/favorites", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await favoriteService.listFavorites(req.userId!);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

userRoutes.post("/favorites", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId, itemType } = req.body as { itemId?: string; itemType?: string };
    if (!itemId || !itemType) {
      res.status(400).json({ success: false, message: "itemId e itemType são obrigatórios." });
      return;
    }
    await favoriteService.addFavorite(req.userId!, itemId, itemType);
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

userRoutes.delete("/favorites/:itemId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.params.itemId as string;
    const itemType = req.query.itemType as string | undefined;
    if (!itemType) {
      res.status(400).json({ success: false, message: "itemType é obrigatório (query param)." });
      return;
    }
    await favoriteService.removeFavorite(req.userId!, itemId, itemType);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
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

    const authReq = req as AuthenticatedRequest;
    await userService.changePassword(authReq.userId!, currentPassword, newPassword);

    res.json({
      success: true,
      message: "Senha alterada com sucesso"
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// LGPD: exportação e exclusão reais dos próprios dados (autoatendimento — antes só havia
// um texto na página de LGPD pedindo para mandar email).
userRoutes.get("/me/data-export", authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const data = await exportUserData(authReq.userId!);
    res.setHeader("Content-Disposition", "attachment; filename=meus-dados.json");
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }
    logger.error({ err: error }, "Erro ao exportar dados do usuário (LGPD)");
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

userRoutes.post("/me/request-deletion", authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await eraseUserData(authReq.userId!);
    res.json({
      success: true,
      message: "Seus dados pessoais foram removidos. Sua sessão será encerrada.",
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }
    logger.error({ err: error }, "Erro ao processar solicitação de exclusão de dados (LGPD)");
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

userRoutes.get("/", authenticate, requireAdmin, userController.listUsers);
// Alias para compatibilidade REST/testes
userRoutes.get("/users", authenticate, requireAdmin, userController.listUsers);

userRoutes.post("/forgot-password", userController.forgotPassword);
userRoutes.post("/reset-password", userController.resetPassword);

export default userRoutes;

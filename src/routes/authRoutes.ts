import { Router, type Router as RouterType } from "express";
import { AuthController } from "../controllers/authController";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";

const authRoutes: any = Router();
const authController = new AuthController();

// Rotas públicas
authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.get('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', authController.resendVerificationPublic);
// Alias para compatibilidade REST/testes
authRoutes.post("/auth/register", authController.register);
authRoutes.post("/auth/login", authController.login);
authRoutes.post("/request-password-reset", authController.requestPasswordReset);
authRoutes.post("/reset-password", authController.resetPassword);
authRoutes.post("/complete-registration", authController.completeRegistration);

// Autenticação social
authRoutes.post("/social/google", authController.socialLogin);
authRoutes.post("/social/facebook", authController.socialLogin);

// Rotas protegidas
authRoutes.get("/me", authMiddleware, authController.getProfile);
authRoutes.get("/profile", authMiddleware, authController.getProfile);
authRoutes.put("/profile", authMiddleware, authController.updateProfile);
authRoutes.post("/logout", authMiddleware, authController.logout);

// Rotas administrativas
authRoutes.post(
  "/invite-collaborator",
  authMiddleware,
  adminOnly,
  authController.inviteCollaborator,
);

// Rota admin para envio de campanhas simples (segmento por role)
authRoutes.post('/admin/send-campaign', authMiddleware, adminOnly, async (req: any, res: any, next: any) => {
  try {
    const { subject, html, text, segment } = req.body;
    // segment: { role: 'CLIENT' } ou { ids: ['id1','id2'] }
    let users = [];
    if (segment?.ids && Array.isArray(segment.ids)) {
      users = await (await import('../services/userService')).listUsers();
      users = users.filter((u: any) => segment.ids.includes(u.id));
    } else if (segment?.role) {
      users = await (await import('../services/userService')).findAllClients();
      if (segment.role !== 'CLIENT') {
        // fallback: list all users and filter
        users = await (await import('../services/userService')).listUsers();
        users = users.filter((u: any) => u.role === segment.role);
      }
    } else {
      users = await (await import('../services/userService')).listUsers();
    }

    const EmailSvc = (await import('../services/emailService')).default;
    // enviar em lotes com throttle simples para não sobrecarregar
    const BATCH = 50;
    for (let i = 0; i < users.length; i += BATCH) {
      const batch = users.slice(i, i + BATCH);
      await Promise.all(batch.map((u: any) => EmailSvc.sendMail(u.email, subject, html, text)));
      // pequeno delay entre batches
      await new Promise((r) => setTimeout(r, 500));
    }

    res.json({ success: true, sent: users.length });
  } catch (error) {
    next(error);
  }
});

export default authRoutes;

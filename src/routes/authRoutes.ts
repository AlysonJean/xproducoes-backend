import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth";
import { authRateLimit, passwordResetRateLimit } from "../middlewares/rateLimitMiddleware";
import { validateJsonContentType } from "../middlewares/contentTypeValidation";
import { z } from 'zod';
import { userRegisterSchema, userLoginSchema } from '../validators/userSchema';
import { registerFromInvite } from '../controllers/inviteController';

// Middleware simples de validação com Zod
const validate = (schema: z.ZodSchema<any>) => (req: any, res: any, next: any) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return res.status(422).json({ message: 'Dados inválidos', details: err.issues });
    }
    next(err);
  }
};

const resetSchema = z.object({ email: z.string().email().optional(), token: z.string().min(10).optional(), password: z.string().min(8).optional() });

const authRoutes: any = Router();
const authController = new AuthController();

// Rotas públicas
authRoutes.post("/register", validateJsonContentType, authRateLimit, validate(userRegisterSchema), authController.register);
authRoutes.post("/login", validateJsonContentType, authRateLimit, validate(userLoginSchema), authController.login);
// Registro público a partir de convite
authRoutes.post('/register-from-invite', registerFromInvite);
authRoutes.get('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', authRateLimit, authController.resendVerificationPublic);
// Alias para compatibilidade REST/testes
authRoutes.post("/auth/register", authRateLimit, validate(userRegisterSchema), authController.register);
authRoutes.post("/auth/login", authRateLimit, validate(userLoginSchema), authController.login);
authRoutes.post("/request-password-reset", passwordResetRateLimit, validate(resetSchema.pick({ email: true })), authController.requestPasswordReset);
authRoutes.post("/reset-password", passwordResetRateLimit, validate(resetSchema.pick({ token: true, password: true })), authController.resetPassword);
authRoutes.post("/complete-registration", authController.completeRegistration);
authRoutes.post("/refresh", authController.refresh);

// Autenticação social
authRoutes.post("/social/google", authRateLimit, authController.socialLogin);
authRoutes.post("/social/facebook", authRateLimit, authController.socialLogin);
// OAuth Google (OIDC Authorization Code + PKCE)
authRoutes.get('/oauth/google/authorize', authRateLimit, authController.googleAuthorize);
authRoutes.get('/oauth/google/callback', authRateLimit, authController.googleCallback);
// OAuth Facebook
authRoutes.get('/oauth/facebook/authorize', authRateLimit, authController.facebookAuthorize);
authRoutes.get('/oauth/facebook/callback', authRateLimit, authController.facebookCallback);

// Rotas protegidas
authRoutes.get("/me", authenticate, authController.getProfile);
authRoutes.get("/profile", authenticate, authController.getProfile);
authRoutes.put("/profile", authenticate, authController.updateProfile);
authRoutes.post("/logout", authenticate, authController.logout);

// Rotas administrativas
authRoutes.post(
  "/invite-collaborator",
  authenticate,
  requireAdmin,
  authController.inviteCollaborator,
);

// Rota admin para envio de campanhas simples (segmento por role)
authRoutes.post('/admin/send-campaign', authenticate, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const { subject, html, text, segment } = req.body;
    // segment: { role: 'CLIENT' } ou { ids: ['id1','id2'] }
    let users: any[] = [];
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

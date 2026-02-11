import { createSafeRouter } from "../middlewares/safeRouter";
import { AuthController } from "../controllers/authController";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth";
import { authRateLimit, passwordResetRateLimit } from "../middlewares/rateLimitMiddleware";
import { validateJsonContentType } from "../middlewares/contentTypeValidation";
import { validateBody } from "../config/validation";
import { loginSchema, registerSchema, requestPasswordResetSchema, resetPasswordSchema, socialLoginSchema } from "../schemas/auth.schema";
import { registerFromInvite } from '../controllers/inviteController';

const authRoutes = createSafeRouter();
const authController = new AuthController();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar novo usuário
 *     description: Cria uma nova conta de usuário (cliente por padrão)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email já cadastrado
 */
authRoutes.post("/register", validateJsonContentType, authRateLimit, validateBody(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login de usuário
 *     description: Autentica um usuário e retorna tokens JWT (também via cookies httpOnly)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *         headers:
 *           Set-Cookie:
 *             description: Cookies httpOnly com access e refresh tokens
 *             schema:
 *               type: string
 *       401:
 *         description: Credenciais inválidas
 *       403:
 *         description: Email não verificado
 */
authRoutes.post("/login", validateJsonContentType, authRateLimit, validateBody(loginSchema), authController.login);
// Registro público a partir de convite
authRoutes.post('/register-from-invite', registerFromInvite);
authRoutes.get('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', authRateLimit, validateBody(requestPasswordResetSchema), authController.resendVerificationPublic);
// Alias para compatibilidade REST/testes
authRoutes.post("/auth/register", authRateLimit, validateBody(registerSchema), authController.register);
authRoutes.post("/auth/login", authRateLimit, validateBody(loginSchema), authController.login);
authRoutes.post("/request-password-reset", passwordResetRateLimit, validateBody(requestPasswordResetSchema), authController.requestPasswordReset);
authRoutes.post("/reset-password", passwordResetRateLimit, validateBody(resetPasswordSchema), authController.resetPassword);
authRoutes.post("/complete-registration", authController.completeRegistration);
authRoutes.post("/refresh", authController.refresh);

// Autenticação social
authRoutes.post("/social/google", authRateLimit, validateBody(socialLoginSchema), authController.socialLogin);
authRoutes.post("/social/facebook", authRateLimit, validateBody(socialLoginSchema), authController.socialLogin);
// OAuth Google (OIDC Authorization Code + PKCE)
authRoutes.get('/oauth/google/authorize', authRateLimit, authController.googleAuthorize);
authRoutes.get('/oauth/google/callback', authRateLimit, authController.googleCallback);
// OAuth Facebook
authRoutes.get('/oauth/facebook/authorize', authRateLimit, authController.facebookAuthorize);
authRoutes.get('/oauth/facebook/callback', authRateLimit, authController.facebookCallback);
// Facebook Data Deletion Callback (exigido pelo Facebook)
authRoutes.post('/facebook/data-deletion', authController.facebookDataDeletion);

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

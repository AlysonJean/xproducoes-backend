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
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rateLimitMiddleware_1 = require("../middlewares/rateLimitMiddleware");
const zod_1 = require("zod");
const userSchema_1 = require("../validators/userSchema");
// Middleware simples de validação com Zod
const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    }
    catch (err) {
        if (err?.name === 'ZodError') {
            return res.status(422).json({ message: 'Dados inválidos', details: err.issues });
        }
        next(err);
    }
};
const resetSchema = zod_1.z.object({ email: zod_1.z.string().email().optional(), token: zod_1.z.string().min(10).optional(), password: zod_1.z.string().min(8).optional() });
const authRoutes = (0, express_1.Router)();
const authController = new authController_1.AuthController();
// Rotas públicas
authRoutes.post("/register", rateLimitMiddleware_1.authRateLimit, validate(userSchema_1.userRegisterSchema), authController.register);
authRoutes.post("/login", rateLimitMiddleware_1.authRateLimit, validate(userSchema_1.userLoginSchema), authController.login);
authRoutes.get('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', rateLimitMiddleware_1.authRateLimit, authController.resendVerificationPublic);
// Alias para compatibilidade REST/testes
authRoutes.post("/auth/register", rateLimitMiddleware_1.authRateLimit, validate(userSchema_1.userRegisterSchema), authController.register);
authRoutes.post("/auth/login", rateLimitMiddleware_1.authRateLimit, validate(userSchema_1.userLoginSchema), authController.login);
authRoutes.post("/request-password-reset", rateLimitMiddleware_1.passwordResetRateLimit, validate(resetSchema.pick({ email: true })), authController.requestPasswordReset);
authRoutes.post("/reset-password", rateLimitMiddleware_1.passwordResetRateLimit, validate(resetSchema.pick({ token: true, password: true })), authController.resetPassword);
authRoutes.post("/complete-registration", authController.completeRegistration);
// Autenticação social
authRoutes.post("/social/google", rateLimitMiddleware_1.authRateLimit, authController.socialLogin);
authRoutes.post("/social/facebook", rateLimitMiddleware_1.authRateLimit, authController.socialLogin);
// OAuth Google (OIDC Authorization Code + PKCE)
authRoutes.get('/oauth/google/authorize', rateLimitMiddleware_1.authRateLimit, authController.googleAuthorize);
authRoutes.get('/oauth/google/callback', rateLimitMiddleware_1.authRateLimit, authController.googleCallback);
// OAuth Facebook
authRoutes.get('/oauth/facebook/authorize', rateLimitMiddleware_1.authRateLimit, authController.facebookAuthorize);
authRoutes.get('/oauth/facebook/callback', rateLimitMiddleware_1.authRateLimit, authController.facebookCallback);
// Rotas protegidas
authRoutes.get("/me", authMiddleware_1.authMiddleware, authController.getProfile);
authRoutes.get("/profile", authMiddleware_1.authMiddleware, authController.getProfile);
authRoutes.put("/profile", authMiddleware_1.authMiddleware, authController.updateProfile);
authRoutes.post("/logout", authMiddleware_1.authMiddleware, authController.logout);
// Rotas administrativas
authRoutes.post("/invite-collaborator", authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly, authController.inviteCollaborator);
// Rota admin para envio de campanhas simples (segmento por role)
authRoutes.post('/admin/send-campaign', authMiddleware_1.authMiddleware, authMiddleware_1.adminOnly, async (req, res, next) => {
    try {
        const { subject, html, text, segment } = req.body;
        // segment: { role: 'CLIENT' } ou { ids: ['id1','id2'] }
        let users = [];
        if (segment?.ids && Array.isArray(segment.ids)) {
            users = await (await Promise.resolve().then(() => __importStar(require('../services/userService')))).listUsers();
            users = users.filter((u) => segment.ids.includes(u.id));
        }
        else if (segment?.role) {
            users = await (await Promise.resolve().then(() => __importStar(require('../services/userService')))).findAllClients();
            if (segment.role !== 'CLIENT') {
                // fallback: list all users and filter
                users = await (await Promise.resolve().then(() => __importStar(require('../services/userService')))).listUsers();
                users = users.filter((u) => u.role === segment.role);
            }
        }
        else {
            users = await (await Promise.resolve().then(() => __importStar(require('../services/userService')))).listUsers();
        }
        const EmailSvc = (await Promise.resolve().then(() => __importStar(require('../services/emailService')))).default;
        // enviar em lotes com throttle simples para não sobrecarregar
        const BATCH = 50;
        for (let i = 0; i < users.length; i += BATCH) {
            const batch = users.slice(i, i + BATCH);
            await Promise.all(batch.map((u) => EmailSvc.sendMail(u.email, subject, html, text)));
            // pequeno delay entre batches
            await new Promise((r) => setTimeout(r, 500));
        }
        res.json({ success: true, sent: users.length });
    }
    catch (error) {
        next(error);
    }
});
exports.default = authRoutes;

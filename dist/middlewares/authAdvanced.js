"use strict";
/**
 * 🔐 Sistema de Autorização Avançado com RBAC
 * Controle granular de permissões por recurso e ação
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const prisma_1 = require("../config/prisma");
// ===== MIDDLEWARE DE AUTENTICAÇÃO JWT =====
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Token de acesso obrigatório",
                code: "MISSING_TOKEN",
            });
            return;
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.jwtSecret);
        if (!decoded.userId || !decoded.role) {
            res.status(401).json({
                success: false,
                message: "Token inválido ou malformado",
                code: "INVALID_TOKEN",
            });
            return;
        }
        // Verifica se usuário ainda está ativo no banco
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (!user?.isActive) {
            res.status(401).json({
                success: false,
                message: "Usuário inativo ou não encontrado",
                code: "USER_INACTIVE",
            });
            return;
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: "Token expirado",
                code: "TOKEN_EXPIRED",
            });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: "Token inválido",
                code: "INVALID_TOKEN",
            });
        }
        else {
            console.error("Erro na autenticação:", error);
            res.status(500).json({
                success: false,
                message: "Erro interno do servidor",
                code: "AUTH_ERROR",
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
// ===== SISTEMA DE AUTORIZAÇÃO FLEXÍVEL =====
const hasPermission = (userRole, resource, action, user, resourceId) => {
    if (userRole === "ADMIN")
        return true;
    return false;
};
const authorize = (resource, action, getResourceId) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Usuário não autenticado",
                code: "NOT_AUTHENTICATED",
            });
            return;
        }
        const resourceId = getResourceId ? getResourceId(req) : undefined;
        if (!hasPermission(req.user.role, resource, action, req.user, resourceId)) {
            res.status(403).json({
                success: false,
                message: `Acesso negado: ${action} em ${resource}`,
                code: "INSUFFICIENT_PERMISSIONS",
            });
            return;
        }
        next();
    };
};
const requireAuth = [exports.authenticateToken];
const requireAdmin = [
    exports.authenticateToken,
    (req, res, next) => {
        if (req.user && req.user.role === "ADMIN") {
            return next();
        }
        res.status(403).json({
            success: false,
            message: "Acesso restrito a administradores",
            code: "FORBIDDEN",
        });
    },
];
const requireStaff = [
    exports.authenticateToken,
    (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Não autenticado" });
            return;
        }
        const staffRoles = [
            "ADMIN",
            "MANAGER",
            "OPERATOR",
            "COLLABORATOR",
        ];
        if (!staffRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: "Acesso restrito à equipe",
                code: "STAFF_ONLY",
            });
            return;
        }
        next();
    },
];
const requireManager = [
    exports.authenticateToken,
    (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Não autenticado" });
            return;
        }
        const managerRoles = ["ADMIN", "MANAGER"];
        if (!managerRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: "Acesso restrito à gerência",
                code: "MANAGER_ONLY",
            });
            return;
        }
        next();
    },
];
const requireSelfOrStaff = (getUserId) => [
    exports.authenticateToken,
    (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Não autenticado" });
            return;
        }
        const targetUserId = getUserId(req);
        const isOwner = req.user.id === targetUserId;
        const isStaff = ["ADMIN", "MANAGER", "OPERATOR", "COLLABORATOR"].includes(req.user.role);
        if (!isOwner && !isStaff) {
            res.status(403).json({
                success: false,
                message: "Acesso negado: recurso privado",
                code: "PRIVATE_RESOURCE",
            });
            return;
        }
        next();
    },
];
const generateToken = (userId, email, role) => {
    // envConfig will generate ephemeral secret in non-production if missing, or exit in production
    const secret = environment_1.config.jwtSecret;
    const payload = {
        userId,
        email,
        role,
        iat: Math.floor(Date.now() / 1000),
        jti: `${userId}-${Date.now()}`,
    };
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: "24h" });
};
const hasMinimumRole = (userRole, minimumRole) => {
    const hierarchy = [
        "CLIENT",
        "COLLABORATOR",
        "OPERATOR",
        "MANAGER",
        "ADMIN",
    ];
    const userLevel = hierarchy.indexOf(userRole);
    const minimumLevel = hierarchy.indexOf(minimumRole);
    return userLevel >= minimumLevel;
};
const rateLimitByUser = (maxRequests, windowMs) => {
    const userRequests = new Map();
    return (req, res, next) => {
        if (!req.user) {
            next();
            return;
        }
        const userId = req.user.id;
        const now = Date.now();
        const userLimit = userRequests.get(userId);
        if (!userLimit || now > userLimit.resetTime) {
            userRequests.set(userId, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }
        if (userLimit.count >= maxRequests) {
            res.status(429).json({
                success: false,
                message: "Limite de requisições excedido",
                code: "RATE_LIMIT_EXCEEDED",
                retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
            });
            return;
        }
        userLimit.count++;
        next();
    };
};
exports.default = {
    authenticateToken: exports.authenticateToken,
    hasPermission,
    authorize,
    requireAuth,
    requireAdmin,
    requireStaff,
    requireManager,
    requireSelfOrStaff,
    generateToken,
    hasMinimumRole,
    rateLimitByUser,
};

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCollaboratorOrAdmin = exports.requireAdmin = void 0;
exports.enhancedAuthMiddleware = enhancedAuthMiddleware;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
function enhancedAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.warn('[AUTH] No Authorization header', {
            method: req.method,
            path: req.path,
            ip: req.ip,
        });
        return res.status(401).json({
            success: false,
            message: "Token de autorização não fornecido",
            code: "NO_AUTH_HEADER",
            details: "Include Authorization: Bearer <token> in request headers"
        });
    }
    const [bearer, token] = authHeader.split(" ");
    if (bearer !== "Bearer" || !token) {
        console.warn('[AUTH] Invalid token format', {
            method: req.method,
            path: req.path,
            ip: req.ip,
        });
        return res.status(401).json({
            success: false,
            message: "Formato de token inválido",
            code: "INVALID_TOKEN_FORMAT",
            details: "Use format: Authorization: Bearer <token>"
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.jwtSecret);
        // Check token expiration
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
            console.warn('[AUTH] Token expired', {
                method: req.method,
                path: req.path,
                ip: req.ip,
                expiredAt: new Date(decoded.exp * 1000).toISOString(),
            });
            return res.status(401).json({
                success: false,
                message: "Token expirado",
                code: "TOKEN_EXPIRED",
                expiredAt: new Date(decoded.exp * 1000).toISOString()
            });
        }
        req.authUser = decoded;
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        console.info('[AUTH] Authenticated request', {
            method: req.method,
            path: req.path,
            userId: decoded.userId,
            role: decoded.role,
            ip: req.ip,
        });
        return next();
    }
    catch (error) {
        // Log seguro: não usar o erro inteiro como string de formato
        console.warn('[AUTH] JWT verification failed', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            message: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: "Token expirado",
                code: "TOKEN_EXPIRED",
                expiredAt: new Date(error.expiredAt * 1000).toISOString()
            });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: "Token inválido",
                code: "INVALID_TOKEN",
                details: error.message
            });
        }
        else {
            return res.status(401).json({
                success: false,
                message: "Erro de autenticação",
                code: "AUTH_ERROR",
                details: "Token verification failed"
            });
        }
    }
}
// Middleware to check specific roles
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.userRole) {
            return res.status(401).json({
                success: false,
                message: "Usuário não autenticado",
                code: "NOT_AUTHENTICATED"
            });
        }
        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({
                success: false,
                message: "Acesso negado",
                code: "INSUFFICIENT_PERMISSIONS",
                requiredRoles: allowedRoles,
                userRole: req.userRole
            });
        }
        return next();
    };
}
// Admin-only middleware
exports.requireAdmin = requireRole(["ADMIN"]);
// Collaborator or Admin middleware
exports.requireCollaboratorOrAdmin = requireRole(["COLLABORATOR", "ADMIN"]);

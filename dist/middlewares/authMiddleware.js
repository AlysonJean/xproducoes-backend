"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminOnly = adminOnly;
exports.collaboratorOnly = collaboratorOnly;
exports.adminOrCollaborator = adminOrCollaborator;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res
            .status(401)
            .json({ message: "Token de autorização não fornecido" });
    }
    const [bearer, token] = authHeader.split(" ");
    if (bearer !== "Bearer" || !token) {
        return res.status(401).json({ message: "Formato de token inválido" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.jwtSecret);
        req.authUser = decoded;
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        return next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({ message: "Token expirado" });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ message: "Token inválido" });
        }
        else {
            return res.status(401).json({ message: "Erro de autenticação" });
        }
    }
}
// Middleware para garantir que só ADMIN acesse
function adminOnly(req, res, next) {
    if (req.userRole !== "ADMIN") {
        return res
            .status(403)
            .json({ message: "Acesso negado: Apenas administradores" });
    }
    return next();
}
// Middleware para garantir que só COLLABORATOR acesse
function collaboratorOnly(req, res, next) {
    if (req.userRole !== "COLLABORATOR") {
        return res
            .status(403)
            .json({ message: "Acesso negado: Apenas colaboradores" });
    }
    return next();
}
// Middleware para garantir que ADMIN ou COLLABORATOR tenham acesso
function adminOrCollaborator(req, res, next) {
    if (req.userRole !== "ADMIN" && req.userRole !== "COLLABORATOR") {
        return res.status(403).json({
            message: "Acesso negado: Apenas administradores ou colaboradores",
        });
    }
    return next();
}
// Middleware opcional de autenticação (não falha se não houver token)
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next();
    }
    const [bearer, token] = authHeader.split(" ");
    if (bearer !== "Bearer" || !token) {
        return next();
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.jwtSecret);
        req.authUser = decoded;
        req.userId = decoded.userId;
        req.userRole = decoded.role;
    }
    finally {
        // Se falhar, apenas segue sem autenticação
    }
    next();
}

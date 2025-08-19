"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireClient = exports.requireCollaborator = exports.requireAdmin = exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const config = { jwtSecret: environment_1.config.jwtSecret };
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res
                .status(401)
                .json({ message: "Token de autorização não fornecido" });
        }
        const token = authHeader.substring(7); // Remove "Bearer "
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config.jwtSecret);
            req.userId = decoded.userId;
            req.userRole = decoded.role;
            return next();
        }
        catch (jwtError) {
            return res.status(401).json({ message: "Token de autorização inválido" });
        }
    }
    catch (error) {
        console.error("Erro na autenticação:", error);
        return res.status(500).json({ message: "Erro interno do servidor" });
    }
};
exports.authenticate = authenticate;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        return next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(["ADMIN"]);
exports.requireCollaborator = (0, exports.requireRole)(["COLLABORATOR", "ADMIN"]);
exports.requireClient = (0, exports.requireRole)(["CLIENT", "ADMIN"]);

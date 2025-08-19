"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = roleMiddleware;
exports.adminOnly = adminOnly;
/**
 * Middleware para checar se o usuário possui um dos papéis permitidos.
 * Exemplo de uso: app.use('/rota', roleMiddleware(['ADMIN', 'USER']))
 */
function roleMiddleware(roles) {
    return (req, res, next) => {
        // Supondo que req.userRole é preenchido pelo middleware de autenticação
        if (!req.userRole || !roles.includes(req.userRole)) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        return next();
    };
}
/**
 * Middleware para exigir que o usuário seja ADMIN.
 * Exemplo de uso: app.use('/rota-admin', adminOnly)
 */
function adminOnly(req, res, next) {
    if (req.userRole !== "ADMIN") {
        return res
            .status(403)
            .json({ message: "Acesso restrito a administradores." });
    }
    return next();
}

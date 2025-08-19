"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAdmin = ensureAdmin;
function ensureAdmin(req, res, next) {
    if (req.userRole !== "ADMIN") {
        return res.status(403).json({ message: "Acesso negado." });
    }
    return next();
}

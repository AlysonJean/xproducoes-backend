"use strict";
// Caminho do arquivo: backend/src/middlewares/errorHandler.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = __importDefault(require("../config/logger"));
const zod_1 = require("zod");
// Tipamos o erro como `unknown` para maior segurança
function errorHandler(err, req, res, next) {
    // Log detalhado do erro
    // Verificamos se 'err' é um objeto do tipo Error para acessar 'message' e 'stack'
    if (err instanceof Error) {
        logger_1.default.error({
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
        });
    }
    else {
        // Se não for um Error, logamos o que recebemos
        logger_1.default.error({
            message: "Um erro não padrão ocorreu",
            error: err,
            path: req.path,
            method: req.method,
        });
    }
    // Erro de validação Zod
    if (err instanceof zod_1.ZodError) {
        return res
            .status(422)
            .json({ message: "Dados inválidos", details: err.issues });
    }
    // Para outros erros, retornamos uma mensagem mais específica se possível
    if (err instanceof Error) {
        if (err.message.includes("não encontrado")) {
            return res.status(404).json({ message: err.message });
        }
        if (err.message.includes("Acesso negado")) {
            return res.status(403).json({ message: err.message });
        }
        if (err.message.includes("Credenciais inválidas")) {
            return res.status(401).json({ message: err.message });
        }
        if (err.message.includes("já está em uso") ||
            err.message.includes("já existe")) {
            return res.status(409).json({ message: err.message });
        }
        if (err.message.includes("inválido") ||
            err.message.includes("obrigatório") ||
            err.message.includes("deve ter")) {
            return res.status(400).json({ message: err.message });
        }
        // Para ambiente de desenvolvimento, retornar a mensagem real do erro
        if (process.env.NODE_ENV !== "production") {
            return res.status(500).json({
                message: "Erro interno do servidor",
                details: err.message,
                stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
            });
        }
    }
    // Erro genérico
    return res.status(500).json({ message: "Erro interno do servidor" });
}

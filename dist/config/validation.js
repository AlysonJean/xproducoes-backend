"use strict";
/**
 * 🛡️ Sistema de Validação Robusto
 * Padroniza validação de entrada e tratamento de erros
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuccessResponse = exports.createErrorResponse = exports.validateRequired = exports.validateId = exports.validateQuery = exports.validateParams = exports.validateBody = void 0;
const zod_1 = require("zod");
const logger_1 = __importDefault(require("./logger"));
/**
 * Middleware de validação usando Zod
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
                logger_1.default.error("Validation error in body: " + JSON.stringify({ errors }));
                return res.status(400).json({
                    message: "Dados de entrada inválidos",
                    errors,
                });
            }
            return next(error);
        }
    };
};
exports.validateBody = validateBody;
/**
 * Middleware para validar parâmetros da URL
 */
const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            const validatedParams = schema.parse(req.params);
            req.params = validatedParams;
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
                logger_1.default.error("Validation error in params: " + JSON.stringify({ errors }));
                return res.status(400).json({
                    message: "Parâmetros inválidos",
                    errors,
                });
            }
            return next(error);
        }
    };
};
exports.validateParams = validateParams;
/**
 * Middleware para validar query string
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const validatedQuery = schema.parse(req.query);
            req.query = validatedQuery;
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
                logger_1.default.error("Validation error in query: " + JSON.stringify({ errors }));
                return res.status(400).json({
                    message: "Query string inválida",
                    errors,
                });
            }
            return next(error);
        }
    };
};
exports.validateQuery = validateQuery;
/**
 * Middleware para validar UUID
 */
const validateId = (paramName = "id") => {
    return (req, res, next) => {
        const value = req.params[paramName];
        if (!value) {
            logger_1.default.error(`Missing ${paramName} parameter`);
            return res.status(400).json({
                message: `${paramName} é obrigatório`,
            });
        }
        // Validação básica de ID (pode ser UUID ou outro formato)
        if (typeof value !== 'string' || value.length < 1) {
            logger_1.default.error(`Invalid ${paramName} format: "${value}"`);
            return res.status(400).json({
                message: `${paramName} inválido`,
            });
        }
        return next();
    };
};
exports.validateId = validateId;
/**
 * Middleware para validar campos obrigatórios
 */
const validateRequired = (fields) => {
    return (req, res, next) => {
        const missing = [];
        for (const field of fields) {
            if (!req.body[field]) {
                missing.push(field);
            }
        }
        if (missing.length > 0) {
            logger_1.default.error("Missing required fields: " + JSON.stringify({ missing }));
            return res.status(400).json({
                message: "Campos obrigatórios ausentes",
                missing,
            });
        }
        return next();
    };
};
exports.validateRequired = validateRequired;
/**
 * Utilitário para criar response de erro padronizado
 */
const createErrorResponse = (message, details) => {
    return {
        success: false,
        message,
        ...(details && { details }),
        timestamp: new Date().toISOString(),
    };
};
exports.createErrorResponse = createErrorResponse;
/**
 * Utilitário para criar response de sucesso padronizado
 */
const createSuccessResponse = (data, message) => {
    return {
        success: true,
        ...(message && { message }),
        ...(data && { data }),
        timestamp: new Date().toISOString(),
    };
};
exports.createSuccessResponse = createSuccessResponse;

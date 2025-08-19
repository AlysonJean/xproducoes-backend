"use strict";
/**
 * 🎯 Utilitários de Resposta Padronizada - Backend
 * Centraliza a criação de respostas consistentes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRequestId = exports.sendPaginated = exports.sendError = exports.sendSuccess = exports.HttpStatus = void 0;
exports.HttpStatus = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
};
/**
 * Envia resposta de sucesso padronizada
 */
const sendSuccess = (res, data, status = exports.HttpStatus.OK, message) => {
    const requestId = res.get("X-Request-ID");
    const response = {
        success: true,
        data,
        ...(message && { message }),
        meta: {
            timestamp: new Date().toISOString(),
            ...(requestId && { requestId }),
        },
    };
    return res.status(status).json(response);
};
exports.sendSuccess = sendSuccess;
/**
 * Envia resposta de erro padronizada
 */
const sendError = (res, message, status = exports.HttpStatus.BAD_REQUEST, errors) => {
    const requestId = res.get("X-Request-ID");
    const response = {
        success: false,
        message,
        ...(errors && { errors }),
        meta: {
            timestamp: new Date().toISOString(),
            ...(requestId && { requestId }),
        },
    };
    return res.status(status).json(response);
};
exports.sendError = sendError;
/**
 * Envia resposta paginada
 */
const sendPaginated = (res, items, total, page, limit, message) => {
    const totalPages = Math.ceil(total / limit);
    const requestId = res.get("X-Request-ID");
    const response = {
        success: true,
        data: {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        },
        ...(message && { message }),
        meta: {
            timestamp: new Date().toISOString(),
            ...(requestId && { requestId }),
        },
    };
    return res.json(response);
};
exports.sendPaginated = sendPaginated;
/**
 * Middleware para adicionar Request ID
 */
const addRequestId = (req, res, next) => {
    const requestId = req.headers["x-request-id"] ||
        `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    res.set("X-Request-ID", requestId);
    req.requestId = requestId;
    next();
};
exports.addRequestId = addRequestId;

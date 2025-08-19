"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.ServiceUnavailableError = exports.RateLimitError = exports.InternalServerError = exports.NotFoundError = exports.ValidationError = exports.DuplicateError = exports.AuthorizationError = exports.AuthenticationError = exports.BookingPermissionError = exports.BookingConflictError = exports.BookingNotFoundError = exports.BookingValidationError = exports.CustomError = void 0;
exports.isOperationalError = isOperationalError;
exports.formatErrorResponse = formatErrorResponse;
/**
 * Classe base para erros personalizados
 */
class CustomError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        // Mantém o stack trace correto
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
/**
 * Erro de validação para reservas
 */
class BookingValidationError extends CustomError {
    constructor(message) {
        super(message, 400);
        this.name = 'BookingValidationError';
    }
}
exports.BookingValidationError = BookingValidationError;
/**
 * Erro quando uma reserva não é encontrada
 */
class BookingNotFoundError extends CustomError {
    constructor(message = 'Reserva não encontrada') {
        super(message, 404);
        this.name = 'BookingNotFoundError';
    }
}
exports.BookingNotFoundError = BookingNotFoundError;
/**
 * Erro de conflito (ex: equipamento já reservado)
 */
class BookingConflictError extends CustomError {
    constructor(message) {
        super(message, 409);
        this.name = 'BookingConflictError';
    }
}
exports.BookingConflictError = BookingConflictError;
/**
 * Erro de permissão
 */
class BookingPermissionError extends CustomError {
    constructor(message = 'Sem permissão para realizar esta operação') {
        super(message, 403);
        this.name = 'BookingPermissionError';
    }
}
exports.BookingPermissionError = BookingPermissionError;
/**
 * Erro de autenticação
 */
class AuthenticationError extends CustomError {
    constructor(message = 'Não autenticado') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Erro de autorização
 */
class AuthorizationError extends CustomError {
    constructor(message = 'Não autorizado') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Erro de dados duplicados
 */
class DuplicateError extends CustomError {
    constructor(message) {
        super(message, 409);
        this.name = 'DuplicateError';
    }
}
exports.DuplicateError = DuplicateError;
/**
 * Erro de dados inválidos
 */
class ValidationError extends CustomError {
    constructor(message, field, value) {
        super(message, 400);
        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
    }
}
exports.ValidationError = ValidationError;
/**
 * Erro de recurso não encontrado
 */
class NotFoundError extends CustomError {
    constructor(message = 'Recurso não encontrado') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Erro interno do servidor
 */
class InternalServerError extends CustomError {
    constructor(message = 'Erro interno do servidor') {
        super(message, 500);
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
/**
 * Erro de rate limiting
 */
class RateLimitError extends CustomError {
    constructor(message = 'Muitas tentativas. Tente novamente mais tarde.') {
        super(message, 429);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Erro de serviço indisponível
 */
class ServiceUnavailableError extends CustomError {
    constructor(message = 'Serviço temporariamente indisponível') {
        super(message, 503);
        this.name = 'ServiceUnavailableError';
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
/**
 * Função helper para verificar se um erro é operacional
 */
function isOperationalError(error) {
    if (error instanceof CustomError) {
        return error.isOperational;
    }
    return false;
}
/**
 * Função helper para formatar erros para resposta da API
 */
function formatErrorResponse(error) {
    if (error instanceof CustomError) {
        const response = {
            message: error.message,
            statusCode: error.statusCode,
            name: error.name
        };
        if (error instanceof ValidationError) {
            response.field = error.field;
            response.value = error.value;
        }
        return response;
    }
    // Para erros não customizados, retorna erro genérico
    return {
        message: 'Erro interno do servidor',
        statusCode: 500,
        name: 'InternalServerError'
    };
}
/**
 * Lista de códigos de erro comuns
 */
exports.ERROR_CODES = {
    // Erros de validação (400)
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',
    // Erros de autenticação (401)
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    // Erros de autorização (403)
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    ACCESS_DENIED: 'ACCESS_DENIED',
    // Erros de recursos não encontrados (404)
    BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    EQUIPMENT_NOT_FOUND: 'EQUIPMENT_NOT_FOUND',
    KIT_NOT_FOUND: 'KIT_NOT_FOUND',
    // Erros de conflito (409)
    EQUIPMENT_ALREADY_BOOKED: 'EQUIPMENT_ALREADY_BOOKED',
    KIT_ALREADY_BOOKED: 'KIT_ALREADY_BOOKED',
    BOOKING_CONFLICT: 'BOOKING_CONFLICT',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    // Erros do servidor (500)
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SERVICE_ERROR: 'SERVICE_ERROR'
};

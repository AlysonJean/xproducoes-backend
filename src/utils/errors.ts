/**
 * Classe base para erros personalizados
 */
export abstract class CustomError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Mantém o stack trace correto
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de validação para reservas
 */
export class BookingValidationError extends CustomError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'BookingValidationError';
  }
}

/**
 * Erro quando uma reserva não é encontrada
 */
export class BookingNotFoundError extends CustomError {
  constructor(message: string = 'Reserva não encontrada') {
    super(message, 404);
    this.name = 'BookingNotFoundError';
  }
}

/**
 * Erro de conflito (ex: equipamento já reservado)
 */
export class BookingConflictError extends CustomError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'BookingConflictError';
  }
}

/**
 * Erro de permissão
 */
export class BookingPermissionError extends CustomError {
  constructor(message: string = 'Sem permissão para realizar esta operação') {
    super(message, 403);
    this.name = 'BookingPermissionError';
  }
}

/**
 * Erro de autenticação
 */
export class AuthenticationError extends CustomError {
  constructor(message: string = 'Não autenticado') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Erro de autorização
 */
export class AuthorizationError extends CustomError {
  constructor(message: string = 'Não autorizado') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Erro de dados duplicados
 */
export class DuplicateError extends CustomError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'DuplicateError';
  }
}

/**
 * Erro de dados inválidos
 */
export class ValidationError extends CustomError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message, 400);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Erro de recurso não encontrado
 */
export class NotFoundError extends CustomError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Erro interno do servidor
 */
export class InternalServerError extends CustomError {
  constructor(message: string = 'Erro interno do servidor') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}

/**
 * Erro de rate limiting
 */
export class RateLimitError extends CustomError {
  constructor(message: string = 'Muitas tentativas. Tente novamente mais tarde.') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Erro de serviço indisponível
 */
export class ServiceUnavailableError extends CustomError {
  constructor(message: string = 'Serviço temporariamente indisponível') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Função helper para verificar se um erro é operacional
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof CustomError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Função helper para formatar erros para resposta da API
 */
export function formatErrorResponse(error: Error): {
  message: string;
  statusCode: number;
  name: string;
  field?: string;
  value?: any;
} {
  if (error instanceof CustomError) {
    const response: any = {
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
export const ERROR_CODES = {
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
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

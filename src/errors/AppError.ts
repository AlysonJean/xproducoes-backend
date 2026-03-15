/**
 * AppError.ts - Classe base para erros customizados
 * Segue padrão enterprise com code, statusCode e contexto
 * 
 * 2026 Best Practices:
 * - Estruturados por tipo (Validation, NotFound, Unauthorized, etc)
 * - Automaticamente logados pelo errorHandler
 * - Não expõem stack trace em produção
 */

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} com ID "${id}" não encontrado` : `${resource} não encontrado`;
    super('NOT_FOUND', message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super('UNAUTHORIZED', message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super('FORBIDDEN', message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('CONFLICT', message, 409, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Erro interno do servidor', details?: Record<string, any>) {
    super('INTERNAL_SERVER_ERROR', message, 500, details);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class BadGatewayError extends AppError {
  constructor(externalService: string, message?: string) {
    const msg = message || `Serviço externo "${externalService}" indisponível`;
    super('BAD_GATEWAY', msg, 502);
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}

// Type guard
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

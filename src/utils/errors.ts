/**
 * 🛠️ SISTEMA DE ERROS CUSTOMIZADOS
 * Centraliza os tipos de erro da aplicação para facilitar o tratamento e monitoramento.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode = 500, isOperational = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado', code?: string) {
    super(message, 404, true, code);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida', code?: string) {
    super(message, 400, true, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado', code?: string) {
    super(message, 401, true, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado', code?: string) {
    super(message, 403, true, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  public details?: unknown;

  constructor(message = 'Erro de validação', details?: unknown) {
    super(message, 422);
    this.details = details;
  }
}

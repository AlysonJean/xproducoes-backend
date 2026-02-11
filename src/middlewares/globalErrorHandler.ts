/**
 * 🛡️ ERROR HANDLER ENTERPRISE-GRADE
 * 
 * Centraliza tratamento de erros com:
 * - Status codes corretos baseados no tipo de erro
 * - Logging estruturado (warn para client errors, error para server errors)
 * - Proteção contra leak de informação em produção
 * - Suporte a erros do Prisma, Zod, JWT e custom AppErrors
 * - Tracking de request ID para correlação de logs
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../utils/errors';

// Prisma error codes reference:
// P2002: Unique constraint
// P2025: Record not found
// P2003: Foreign key constraint
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'Registro já existe' },
  P2025: { status: 404, message: 'Registro não encontrado' },
  P2003: { status: 400, message: 'Referência inválida' },
};

function getStatusCode(err: any): number {
  // Custom AppError
  if (err.statusCode) return err.statusCode;
  if (err.status) return err.status;

  // Prisma errors
  if (err.code && PRISMA_ERROR_MAP[err.code]) {
    return PRISMA_ERROR_MAP[err.code].status;
  }

  // Zod validation errors
  if (err.name === 'ZodError') return 422;

  // JWT errors
  if (err.name === 'JsonWebTokenError') return 401;
  if (err.name === 'TokenExpiredError') return 401;

  // Multer (file upload) errors
  if (err.code === 'LIMIT_FILE_SIZE') return 413;

  return 500;
}

function getErrorMessage(err: any, statusCode: number, isProduction: boolean): string {
  // Custom AppError — always return the message
  if (err instanceof AppError) return err.message;

  // Prisma errors — use mapped message
  if (err.code && PRISMA_ERROR_MAP[err.code]) {
    return PRISMA_ERROR_MAP[err.code].message;
  }

  // Zod validation
  if (err.name === 'ZodError') return 'Dados inválidos';

  // JWT
  if (err.name === 'JsonWebTokenError') return 'Token inválido';
  if (err.name === 'TokenExpiredError') return 'Token expirado';

  // File upload
  if (err.code === 'LIMIT_FILE_SIZE') return 'Arquivo muito grande';

  // In production, hide internal error messages
  if (isProduction && statusCode >= 500) {
    return 'Erro interno do servidor';
  }

  return err.message || 'Erro interno do servidor';
}

export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = getStatusCode(err);
  const isProduction = process.env.NODE_ENV === 'production';
  const message = getErrorMessage(err, statusCode, isProduction);
  const requestId = (req as any).requestId;

  // Log based on severity
  const logPayload = {
    requestId,
    statusCode,
    method: req.method,
    path: req.path,
    ip: req.ip,
    errorCode: err.code,
    ...(statusCode >= 500 ? { stack: err.stack } : {}),
  };

  if (statusCode >= 500) {
    logger.error({ ...logPayload, err }, 'Server error');
  } else if (statusCode >= 400) {
    logger.warn(logPayload, `Client error: ${message}`);
  }

  // Build response
  const response: Record<string, any> = {
    success: false,
    error: message,
    ...(err.code ? { code: err.code } : {}),
    ...(err.name === 'ZodError' ? { details: err.issues } : {}),
    ...(err instanceof AppError && err.code ? { errorCode: err.code } : {}),
    // Include stack trace only in development
    ...(!isProduction && statusCode >= 500 ? { stack: err.stack } : {}),
  };

  // CORS headers for error responses (prevent browser from blocking)
  const allowedOrigins: string[] = [];
  try {
    const corsConfig = require('../config/cors');
    if (corsConfig.allowedOrigins) {
      allowedOrigins.push(...corsConfig.allowedOrigins);
    }
  } catch {
    // cors config not available, skip
  }

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key, x-svg-proxy-token',
    );
  }

  res.status(statusCode).json(response);
}

export default globalErrorHandler;

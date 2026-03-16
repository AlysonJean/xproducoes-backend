import { Request, Response, NextFunction } from "express";
import logger from "../config/logger.js";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
import { securityMonitor } from "../config/securityMonitor.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // 1. Log detalhado
  if (err instanceof Error) {
    logger.error({
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
      requestId: (req as any).requestId,
    });
  } else {
    logger.error({
      message: "Um erro não identificado ocorreu",
      error: err,
      path: req.path,
    });
  }

  // 2. Erros de Validação (Zod)
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: "Erro de validação de dados",
      errors: err.issues,
    });
  }

  // 3. Erros Operacionais da Aplicação (Customizados)
  if (err instanceof AppError) {
    // Reporting security events
    const forwardedFor = req.headers?.['x-forwarded-for'];
    const ip = req.ip || (typeof forwardedFor === 'string' ? forwardedFor : undefined) || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers?.['user-agent'] || 'unknown';

    if ((err as any).statusCode === 401) {
      securityMonitor.recordInvalidToken(ip, userAgent, req.path, { message: (err as any).message });
    } else if ((err as any).statusCode === 403) {
      securityMonitor.recordSuspiciousActivity(ip, userAgent, req.path, { message: (err as any).message, type: 'forbidden_access' });
    }

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.constructor.name === 'ValidationError' && { details: (err as any).details })
    });
  }

  // 4. Erros do Prisma (Opcional: tratar erros comuns de banco)
  // if (err instanceof Prisma.PrismaClientKnownRequestError) { ... }

  // 5. Erro Genérico (Fallback de Segurança)
  const isProd = process.env.NODE_ENV === "production";
  
  return res.status(500).json({
    success: false,
    message: isProd ? "Ocorreu um erro interno no servidor" : (err instanceof Error ? err.message : "Erro desconhecido"),
    ...( !isProd && err instanceof Error ? { stack: err.stack } : {} )
  });
}

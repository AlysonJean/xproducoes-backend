import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../config/logger';
import { context } from '../config/asyncContext';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware para adicionar um Request ID único a cada requisição.
 * Permite rastreamento de logs distribuídos e correlação entre serviços.
 * 
 * O Request ID pode vir de:
 * 1. Header X-Request-ID (se fornecido pelo cliente/proxy)
 * 2. Header X-Correlation-ID (padrão alternativo)
 * 3. UUID gerado automaticamente
 * 
 * O ID é adicionado ao objeto de request e ao header de resposta.
 * Também inicializa o AsyncLocalStorage para logs contextuais.
 * 
 * @example
 * // Em qualquer controller/service com acesso ao req:
 * logger.info({ requestId: req.requestId, userId: user.id }, 'User logged in');
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Tenta obter request ID de headers existentes (útil para distributed tracing)
  const existingRequestId = 
    req.headers['x-request-id'] as string || 
    req.headers['x-correlation-id'] as string;

  // Gera novo UUID se não houver request ID
  const requestId = existingRequestId || randomUUID();

  // Anexa ao objeto request para uso em controllers/services
  req.requestId = requestId;

  // Retorna no header de resposta para facilitar debugging
  res.setHeader('X-Request-ID', requestId);

  // Log de entrada da request com contexto completo
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  }, 'Incoming request');

  // Executa o próximo middleware dentro do contexto assíncrono
  context.run({ requestId }, () => {
    next();
  });
}

/**
 * Extensão do logger para incluir automaticamente o Request ID.
 * Use esta função em controllers/services que têm acesso ao request.
 * 
 * @example
 * import { createRequestLogger } from '../middlewares/requestIdMiddleware';
 * 
 * export async function createBooking(req: Request, res: Response) {
 *   const log = createRequestLogger(req);
 *   log.info({ bookingId: '123' }, 'Booking created successfully');
 * }
 */
export function createRequestLogger(req: Request) {
  const requestId = req.requestId;

  return {
    info: (obj: object | string, msg?: string) => {
      if (typeof obj === 'string') {
        logger.info({ requestId }, obj);
      } else {
        logger.info({ requestId, ...obj }, msg || '');
      }
    },
    warn: (obj: object | string, msg?: string) => {
      if (typeof obj === 'string') {
        logger.warn({ requestId }, obj);
      } else {
        logger.warn({ requestId, ...obj }, msg || '');
      }
    },
    error: (obj: object | string, msg?: string) => {
      if (typeof obj === 'string') {
        logger.error({ requestId }, obj);
      } else {
        logger.error({ requestId, ...obj }, msg || '');
      }
    },
  };
}

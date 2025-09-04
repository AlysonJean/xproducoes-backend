import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiting para autenticação - Mais restritivo
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Máximo 20 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de autenticação. Aguarde antes de tentar novamente.',
    });
  },
  skip: (req: Request) => {
    const whitelist = ['127.0.0.1', '::1'];
    return req.ip ? whitelist.includes(req.ip) : false;
  },
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export const createResourceRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

export const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.body?.email || req.ip,
});

export const dynamicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req: any) => {
    if (req && req.headers && req.headers.authorization) return 200;
    return 50;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const criticalEndpointRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const logData = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      path: req.path,
    };
    console.warn('[RATE LIMIT] Endpoint crítico atingido', logData);
    res.status(429).json({ error: 'Operação crítica limitada. Aguarde alguns minutos.' });
  },
});

export const rateLimiters = {
  auth: authRateLimit,
  api: apiRateLimit,
  createResource: createResourceRateLimit,
  upload: uploadRateLimit,
  search: searchRateLimit,
  passwordReset: passwordResetRateLimit,
  dynamic: dynamicRateLimit,
  critical: criticalEndpointRateLimit,
};

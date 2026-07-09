import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import logger from "../config/logger";

/**
 * Gera chave combinando IP + userId (quando autenticado)
 * Isso permite rate limiting mais preciso por usuário
 */
const userKeyGenerator = (req: Request): string => {
  const userId = req.userId;
  try {
    const ipKey = ipKeyGenerator(req.ip || '');
    return userId ? `user:${userId}` : `ip:${ipKey}`;
  } catch {
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  }
};

/**
 * Rate limiting por usuário autenticado
 * Usado para endpoints que requerem autenticação
 */
export const userRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por usuário
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  handler: (req: Request, res: Response) => {
    const userId = req.userId;
    logger.warn({
      userId,
      ip: req.ip,
      path: req.path,
    }, 'Rate limit por usuário excedido');
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Muitas requisições. Aguarde antes de continuar.',
    });
  },
});

/**
 * Rate limiting por usuário para operações de escrita
 */
export const userWriteRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 30, // 30 operações de escrita por usuário
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  handler: (req: Request, res: Response) => {
    const userId = req.userId;
    logger.warn({
      userId,
      ip: req.ip,
      path: req.path,
      method: req.method,
    }, 'Rate limit de escrita por usuário excedido');
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Muitas operações. Aguarde antes de continuar.',
    });
  },
});

/**
 * Middleware de rate limiting adaptativo
 * Mais restritivo para IPs, mais permissivo para usuários autenticados
 */
export const adaptiveRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  if (userId) {
    return userRateLimit(req, res, next);
  }
  return apiRateLimit(req, res, next);
};


// Rate limiting para autenticação - Mais restritivo
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 20 : 200, // 20 prod, 200 dev
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn({
      ip: req.ip,
      path: req.path,
      environment: process.env.NODE_ENV
    }, 'Rate limit de autenticação excedido');
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de autenticação. Aguarde antes de tentar novamente.',
    });
  },
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Aumentado para debug
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
  max: process.env.NODE_ENV === 'production' ? 10 : 50, // 10 prod, 50 dev
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
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // 3 prod, 10 dev
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // prefer per-email rate limiting, fall back to normalized IP key
    // use express-rate-limit's helper to correctly handle IPv6 formats
    // (e.g. ::ffff:127.0.0.1)
    try {
      const ipKey = ipKeyGenerator(req.ip || '');
      return (req.body && req.body.email) ? req.body.email : ipKey;
    } catch {
      return req.body?.email || (req.ip as string);
    }
  },
  handler: (req: Request, res: Response) => {
    logger.warn({
      email: req.body?.email,
      ip: req.ip,
      path: req.path,
    }, 'Rate limit de reset de senha excedido');
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de reset de senha. Aguarde antes de tentar novamente.',
    });
  },
});

export const dynamicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req: Request) => {
    if (req && req.headers && req.headers.authorization) return 200;
    return 50;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const criticalEndpointRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10, // Aumentado para teste/dev de 3 para 10
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const logData = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      path: req.path,
    };
    logger.warn(logData, '[RATE LIMIT] Endpoint crítico atingido');
    res.status(429).json({ error: 'Operação crítica limitada. Aguarde alguns minutos.' });
  },
});

// Rate limiting para pagamentos - Muito restritivo
export const paymentRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5, // Máximo 5 tentativas de pagamento
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn({
      ip: req.ip,
      userId: req.userId,
      userAgent: req.headers['user-agent'],
      path: req.path,
    }, '[RATE LIMIT] Tentativas de pagamento excedidas');
    res.status(429).json({
      success: false,
      error: 'PAYMENT_RATE_LIMIT',
      message: 'Muitas tentativas de pagamento. Por favor, aguarde 10 minutos.',
    });
  },
});

// Rate limiting para carrinho - Moderado
export const cartRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // Aumentado de 20 para 100
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'CART_RATE_LIMIT',
      message: 'Operações no carrinho muito rápidas. Aguarde um momento.',
    });
  },
});

// Rate limiting para quotes - Moderado
export const quoteRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 solicitações de orçamento
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'QUOTE_RATE_LIMIT',
      message: 'Muitas solicitações de orçamento. Aguarde alguns minutos.',
    });
  },
});

// Rate limiting para review/comentários - Anti-spam
export const reviewRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 avaliações por hora
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'REVIEW_RATE_LIMIT',
      message: 'Limite de avaliações atingido. Tente novamente em 1 hora.',
    });
  },
});

// Rate limiting para dashboard queries - Proteção de recursos
export const dashboardRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: process.env.NODE_ENV === 'production' ? 30 : 150, // 30 prod, 150 dev
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator, // Rate limit por usuário, não por IP
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'DASHBOARD_RATE_LIMIT',
      message: 'Muitas requisições ao dashboard. Aguarde um momento.',
    });
  },
});

// Rate limiting para formulário de contato público - Anti-spam
export const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 mensagens por hora por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'CONTACT_RATE_LIMIT',
      message: 'Muitas mensagens enviadas. Aguarde 1 hora antes de tentar novamente.',
    });
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
  payment: paymentRateLimit,
  cart: cartRateLimit,
  quote: quoteRateLimit,
  review: reviewRateLimit,
  dashboard: dashboardRateLimit,
  user: userRateLimit,
  userWrite: userWriteRateLimit,
  adaptive: adaptiveRateLimit,
};

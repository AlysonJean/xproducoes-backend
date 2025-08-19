/**
 * ✅ RATE LIMITING MIDDLEWARE - ENTERPRISE SECURITY
 * Implementação de rate limiting para proteção contra ataques
 * DDoS, força bruta e uso excessivo da API
 */

import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// ✅ CONFIGURAÇÕES DE RATE LIMITING POR TIPO DE ENDPOINT

/**
 * Rate limiting para autenticação - Mais restritivo
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por IP
  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    retryAfter: "15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Customizar resposta de erro
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "Too Many Requests",
      message:
        "Muitas tentativas de autenticação. Aguarde antes de tentar novamente.",
      retryAfter: "15 minutos",
    });
  },
  // Skip lista branca de IPs (opcional)
  skip: (req: Request) => {
    const whitelist = ["127.0.0.1", "::1"]; // localhost
    return req.ip ? whitelist.includes(req.ip) : false;
  },
});

/**
 * Rate limiting para APIs gerais - Moderado
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por IP
  message: {
    error: "Limite de requisições excedido. Tente novamente em alguns minutos.",
    retryAfter: "15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting para criação de recursos - Restritivo
 */
export const createResourceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 criações por minuto
  message: {
    error: "Muitas operações de criação. Aguarde um momento.",
    retryAfter: "1 minuto",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting para upload de arquivos - Muito restritivo
 */
export const uploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // 5 uploads por 5 minutos
  message: {
    error: "Limite de uploads excedido. Aguarde alguns minutos.",
    retryAfter: "5 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting para busca/consulta - Mais permissivo
 */
export const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 buscas por minuto
  message: {
    error: "Muitas consultas em pouco tempo. Aguarde um momento.",
    retryAfter: "1 minuto",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting para recuperação de senha - Muito restritivo
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 tentativas por hora
  message: {
    error:
      "Muitas tentativas de recuperação de senha. Tente novamente em 1 hora.",
    retryAfter: "1 hora",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Aplicar por email além do IP
  keyGenerator: (req: Request) => {
    return req.body.email || req.ip;
  },
});

/**
 * ✅ RATE LIMITING DINÂMICO BASEADO NO USUÁRIO
 * Diferentes limites para usuários autenticados vs anônimos
 */
export const dynamicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req: Request) => {
    // Usuários autenticados têm limite maior
    if (req.headers.authorization) {
      return 200; // 200 req/15min para usuários logados
    }
    return 50; // 50 req/15min para usuários anônimos
  },
  message: {
    error: "Limite de requisições excedido.",
    suggestion: "Usuários autenticados têm limites maiores.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * ✅ RATE LIMITING PARA PROTEÇÃO DE ENDPOINTS CRÍTICOS
 */
export const criticalEndpointRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3, // Apenas 3 operações críticas por 5 minutos
  message: {
    error: "Operação crítica limitada. Aguarde alguns minutos.",
    retryAfter: "5 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Handler customizado para logging
  handler: (req: Request, res: Response) => {
    console.warn(
      `Rate limit atingido para endpoint crítico: ${req.path} - IP: ${req.ip}`,
      {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    );

    res.status(429).json({
      error: "Operação crítica limitada. Aguarde alguns minutos.",
      retryAfter: "5 minutos",
    });
  },
});

/**
 * ✅ MIDDLEWARE CUSTOMIZADO PARA LOGGING DE RATE LIMITING
 */
export const rateLimitLogger = (req: Request, res: Response, next: any) => {
  // Log de requisições que estão próximas do limite
  const remaining = res.getHeader("X-RateLimit-Remaining") as number;
  const limit = res.getHeader("X-RateLimit-Limit") as number;

  if (remaining && limit && remaining < limit * 0.1) {
    // Menos de 10% restante
    console.warn(
      `Rate limit próximo do limite: ${req.ip} - ${remaining}/${limit} restantes`,
      {
        ip: req.ip,
        path: req.path,
        remaining,
        limit,
        timestamp: new Date().toISOString(),
      },
    );
  }

  next();
};

// ✅ EXPORT CONSOLIDADO DE TODOS OS RATE LIMITERS
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

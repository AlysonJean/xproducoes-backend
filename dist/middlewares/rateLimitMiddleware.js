"use strict";
/**
 * ✅ RATE LIMITING MIDDLEWARE - ENTERPRISE SECURITY
 * Implementação de rate limiting para proteção contra ataques
 * DDoS, força bruta e uso excessivo da API
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiters = exports.rateLimitLogger = exports.criticalEndpointRateLimit = exports.dynamicRateLimit = exports.passwordResetRateLimit = exports.searchRateLimit = exports.uploadRateLimit = exports.createResourceRateLimit = exports.apiRateLimit = exports.authRateLimit = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
// ✅ CONFIGURAÇÕES DE RATE LIMITING POR TIPO DE ENDPOINT
/**
 * Rate limiting para autenticação - Mais restritivo
 */
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 tentativas por IP
    message: {
        error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
        retryAfter: "15 minutos",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Customizar resposta de erro
    handler: (req, res) => {
        res.status(429).json({
            error: "Too Many Requests",
            message: "Muitas tentativas de autenticação. Aguarde antes de tentar novamente.",
            retryAfter: "15 minutos",
        });
    },
    // Skip lista branca de IPs (opcional)
    skip: (req) => {
        const whitelist = ["127.0.0.1", "::1"]; // localhost
        return req.ip ? whitelist.includes(req.ip) : false;
    },
});
/**
 * Rate limiting para APIs gerais - Moderado
 */
exports.apiRateLimit = (0, express_rate_limit_1.default)({
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
exports.createResourceRateLimit = (0, express_rate_limit_1.default)({
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
exports.uploadRateLimit = (0, express_rate_limit_1.default)({
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
exports.searchRateLimit = (0, express_rate_limit_1.default)({
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
exports.passwordResetRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Máximo 3 tentativas por hora
    message: {
        error: "Muitas tentativas de recuperação de senha. Tente novamente em 1 hora.",
        retryAfter: "1 hora",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Aplicar por email além do IP com fallback IPv6-safe
    keyGenerator: (req) => req.body?.email || (0, express_rate_limit_1.ipKeyGenerator)({
        // express-rate-limit types accept a minimal shape containing ip
        // cast to any to satisfy helper signature across versions
        ip: req.ip,
    }),
});
/**
 * ✅ RATE LIMITING DINÂMICO BASEADO NO USUÁRIO
 * Diferentes limites para usuários autenticados vs anônimos
 */
exports.dynamicRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: (req) => {
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
exports.criticalEndpointRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 3, // Apenas 3 operações críticas por 5 minutos
    message: {
        error: "Operação crítica limitada. Aguarde alguns minutos.",
        retryAfter: "5 minutos",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Handler customizado para logging
    handler: (req, res) => {
        // Log seguro: nunca use dados do usuário como string de formato
        const logData = {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            timestamp: new Date().toISOString(),
            path: req.path,
        };
        console.warn("[RATE LIMIT] Endpoint crítico atingido", logData);
        res.status(429).json({
            error: "Operação crítica limitada. Aguarde alguns minutos.",
            retryAfter: "5 minutos",
        });
    },
});
/**
 * ✅ MIDDLEWARE CUSTOMIZADO PARA LOGGING DE RATE LIMITING
 */
const rateLimitLogger = (req, res, next) => {
    // Log de requisições que estão próximas do limite
    const remaining = res.getHeader("X-RateLimit-Remaining");
    const limit = res.getHeader("X-RateLimit-Limit");
    if (remaining && limit && remaining < limit * 0.1) {
        // Menos de 10% restante
        const logData = {
            ip: req.ip,
            path: req.path,
            remaining,
            limit,
            timestamp: new Date().toISOString(),
        };
        console.warn("[RATE LIMIT] Próximo do limite", logData);
    }
    next();
};
exports.rateLimitLogger = rateLimitLogger;
// ✅ EXPORT CONSOLIDADO DE TODOS OS RATE LIMITERS
exports.rateLimiters = {
    auth: exports.authRateLimit,
    api: exports.apiRateLimit,
    createResource: exports.createResourceRateLimit,
    upload: exports.uploadRateLimit,
    search: exports.searchRateLimit,
    passwordReset: exports.passwordResetRateLimit,
    dynamic: exports.dynamicRateLimit,
    critical: exports.criticalEndpointRateLimit,
};

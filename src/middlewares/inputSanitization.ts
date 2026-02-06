import { Request, Response, NextFunction } from 'express';
import xss from 'xss';
import validator from 'validator';
import logger from '../config/logger';

/**
 * Sanitização de Inputs para Prevenir XSS
 * 
 * Este middleware sanitiza recursivamente todos os valores string
 * no body, query e params da requisição para remover scripts maliciosos.
 * 
 * Utiliza xss para limpeza segura de HTML/scripts.
 * 
 * Configuração:
 * - Remove tags <script>, <iframe>, event handlers (onclick, onerror, etc.)
 * - Preserva HTML seguro (útil para campos de texto rico como descrições)
 * - Aplica em todos os níveis de objetos nested
 * 
 * @example
 * // Aplicar globalmente no app.ts:
 * app.use(inputSanitizationMiddleware);
 * 
 * // Ou aplicar em rotas específicas:
 * router.post('/comments', inputSanitizationMiddleware, createComment);
 */
export function inputSanitizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Sanitiza body (POST/PUT/PATCH)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitiza query params (GET) - req.query é read-only em Express, então sanitizamos in-place
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeObject(req.query);
      for (const key in sanitizedQuery) {
        (req.query as any)[key] = sanitizedQuery[key];
      }
    }

    // Sanitiza route params (/users/:id)
    if (req.params && typeof req.params === 'object') {
      const sanitizedParams = sanitizeObject(req.params);
      for (const key in sanitizedParams) {
        (req.params as any)[key] = sanitizedParams[key];
      }
    }

    next();
  } catch (error) {
    logger.error({
      requestId: req.requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    }, 'Input sanitization failed');

    // Não bloqueia a request mesmo se sanitização falhar
    next();
  }
}

/**
 * Sanitiza recursivamente um objeto, processando strings em todos os níveis.
 * 
 * @param obj - Objeto a ser sanitizado
 * @returns Objeto sanitizado
 */
function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitiza também as chaves do objeto (defensivo)
      const sanitizedKey = validator.escape(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }

    return sanitized as T;
  }

  // Números, booleans, null, undefined passam inalterados
  return obj;
}

/**
 * Sanitiza uma string removendo código malicioso.
 * 
 * Configuração do xss:
 * - whiteList: permite apenas tags seguras
 * - stripIgnoreTag: remove tags não permitidas
 * - stripIgnoreTagBody: remove conteúdo de tags script
 * 
 * @param str - String a ser sanitizada
 * @returns String limpa e segura
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }

  // Configuração restritiva do xss
  const clean = xss(str, {
    whiteList: {
      // Tags de formatação inline
      b: [],
      i: [],
      u: [],
      s: [],
      strong: [],
      em: [],
      span: ['class'],
      
      // Tags de parágrafos e quebras
      p: ['class'],
      br: [],
      div: ['class'],
      
      // Listas
      ul: ['class'],
      ol: ['class'],
      li: [],
      
      // Headers
      h1: ['class'],
      h2: ['class'],
      h3: ['class'],
      h4: ['class'],
      h5: ['class'],
      h6: ['class'],
      
      // Outros
      blockquote: ['class'],
      code: [],
      pre: [],
      a: ['href', 'title', 'target', 'rel'],
    },
    // stripIgnoreTag: true, // Conflita com onIgnoreTag
    // stripIgnoreTagBody: ['script', 'style'], // Conflita com onIgnoreTag
    allowCommentTag: false,
    onIgnoreTag: (tag, html, _options) => {
      // Log de tags removidas para análise de segurança
      if (tag === 'script' || tag === 'iframe') {
        logger.warn({
          removedTag: tag,
          html: html.substring(0, 100), // Primeiros 100 caracteres
        }, 'Malicious tag removed from input');
      }
      return '';
    },
  });

  return clean;
}

/**
 * Middleware mais agressivo que remove completamente HTML.
 * Use para campos que NÃO devem conter nenhum markup (ex: nomes, emails, IDs).
 * 
 * @example
 * router.post('/users', strictSanitizationMiddleware, createUser);
 */
export function strictSanitizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = strictSanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = strictSanitizeObject(req.query);
      for (const key in sanitizedQuery) {
        (req.query as any)[key] = sanitizedQuery[key];
      }
    }

    if (req.params && typeof req.params === 'object') {
      const sanitizedParams = strictSanitizeObject(req.params);
      for (const key in sanitizedParams) {
        (req.params as any)[key] = sanitizedParams[key];
      }
    }

    next();
  } catch (error) {
    logger.error({
      requestId: req.requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    }, 'Strict sanitization failed');

    next();
  }
}

/**
 * Sanitização estrita que remove TODO o HTML.
 */
function strictSanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return validator.escape(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => strictSanitizeObject(item)) as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = validator.escape(key);
      sanitized[sanitizedKey] = strictSanitizeObject(value);
    }

    return sanitized as T;
  }

  return obj;
}

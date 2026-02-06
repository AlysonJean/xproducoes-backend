import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

// Cache em memória com suporte a TTL configurável
const cache: Map<string, { data: any; expires: number }> = new Map();

// TTLs diferenciados por tipo de conteúdo
const CACHE_TTL = {
  SHORT: 30 * 1000,    // 30 segundos - dados que mudam frequentemente
  MEDIUM: 60 * 1000,   // 1 minuto - dados médios
  LONG: 5 * 60 * 1000, // 5 minutos - dados estáveis
};

export function cacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  return createCacheMiddleware(CACHE_TTL.MEDIUM)(req, res, next);
}

/**
 * Cria middleware de cache com TTL personalizado
 */
export function createCacheMiddleware(ttl: number = CACHE_TTL.MEDIUM) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!res || typeof res.json !== "function") {
      return next();
    }
    
    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && cached.expires > Date.now()) {
      logger.debug({ key, ttl }, 'Cache HIT');
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      cache.set(key, { data: body, expires: Date.now() + ttl });
      logger.debug({ key, ttl }, 'Cache SET');
      return originalJson(body);
    };

    return next();
  };
}

/**
 * Invalida cache por padrão de chave
 */
// Função de invalidação limpa
export function invalidateCache(pattern: string) {
  let count = 0;
  for (const [key] of cache.entries()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      count++;
    }
  }
  logger.info({ pattern, count }, 'Cache invalidado');
  return count;
}

/**
 * Limpa todo o cache
 */
export function clearCache() {
  const size = cache.size;
  cache.clear();
  logger.info({ size }, 'Cache completamente limpo');
  return size;
}

// Função para aquecer o cache (exemplo simples)
export async function warmCache() {
  // Aqui você pode pré-carregar rotas críticas, se desejar
  // Exemplo: await fetch('http://localhost:3001/api/dashboard');
  // Por enquanto, apenas loga:
  logger.info("Cache aquecido!");
}

// Exportar TTLs para uso em rotas específicas
export { CACHE_TTL };

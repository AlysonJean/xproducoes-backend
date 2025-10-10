import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";


const cache: Map<string, { data: any; expires: number }> = new Map();
const DEFAULT_TTL = 60 * 1000; // 1 minuto

export function cacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!res || typeof res.json !== "function") {
    return next();
  }
  const key = req.originalUrl;
  const cached = cache.get(key);

  if (cached && cached.expires > Date.now()) {
    return res.json(cached.data);
  }

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    cache.set(key, { data: body, expires: Date.now() + DEFAULT_TTL });
    return originalJson(body);
  };

  return next();
}

// Função para aquecer o cache (exemplo simples)
export async function warmCache() {
  // Aqui você pode pré-carregar rotas críticas, se desejar
  // Exemplo: await fetch('http://localhost:3001/api/dashboard');
  // Por enquanto, apenas loga:
  logger.info("Cache aquecido!");
}

import { Request, Response, NextFunction } from "express";
import logger from "./logger";



// Sempre permite localhost em dev
const defaultOrigins = [
  "http://localhost:3000", 
  "http://localhost:3001", 
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173"
];

// Origens de produção conhecidas
const productionOrigins = [
  "https://xproducoeseeventos.com.br",
  "https://www.xproducoeseeventos.com.br",
  "https://xproducoes.vercel.app" // Exemplo de subdomínio Vercel
];

export const allowedOrigins = [
  ...productionOrigins,
  ...((process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url && !productionOrigins.includes(url))),
];

// Em desenvolvimento, adicionamos localhost
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(...defaultOrigins);
}

export function dynamicCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Lógica de Origem
  if (origin) {
    const isAllowed = allowedOrigins.includes(origin) || (!isProduction && origin.includes('localhost'));
    
    if (isAllowed) {
      res.header("Access-Control-Allow-Origin", origin);
    } else if (isProduction) {
      logger.warn({ origin, path: req.path }, 'Origem CORS não autorizada bloqueada em produção');
    }
  }
  
  // Headers Fixos
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key, x-svg-proxy-token"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Vary", "Origin");
  
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  
  next();
}

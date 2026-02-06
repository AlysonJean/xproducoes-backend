import { Request, Response, NextFunction } from "express";



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
  "https://www.xproducoeseeventos.com.br"
];

export const allowedOrigins = [
  ...defaultOrigins,
  ...productionOrigins,
  ...((process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url && !defaultOrigins.includes(url) && !productionOrigins.includes(url))),
].filter((url) => url); // Remove any empty strings

export function dynamicCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Em desenvolvimento, aceitar qualquer origem localhost
  if (!isProduction && origin && origin.includes('localhost')) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (isProduction && origin) {
    // Em produção, logar tentativas de origens não autorizadas
    const logger = require('./logger').default;
    logger.warn({ origin, allowedOrigins }, 'Origem CORS não autorizada bloqueada');
  }
  
  // Sempre definir os cabeçalhos CORS
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key, x-svg-proxy-token"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Vary", "Origin");
  
  // Para requisições preflight OPTIONS, retornar 204
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  
  next();
}

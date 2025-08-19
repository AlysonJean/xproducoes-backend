import { Request, Response, NextFunction } from "express";



// Sempre permite localhost:3000 e 3001 em dev (Vite pode usar qualquer porta)
const defaultOrigins = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];
export const allowedOrigins = [
  ...defaultOrigins,
  ...((process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url && !defaultOrigins.includes(url))),
].filter((url) => url); // Remove any empty strings

export function dynamicCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  
  // Em desenvolvimento, aceitar qualquer origem localhost
  if (process.env.NODE_ENV !== 'production' && origin && origin.includes('localhost')) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  
  // Sempre definir os cabeçalhos CORS
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE,OPTIONS");
  res.header(
  "Access-Control-Allow-Headers",
  "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Vary", "Origin");
  
  // Para requisições preflight OPTIONS, retornar 204
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  
  next();
}

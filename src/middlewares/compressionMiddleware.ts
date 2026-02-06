import compression from "compression";
import { Request, Response, NextFunction, RequestHandler } from "express";

// Compression middleware com configurações otimizadas
export const compressionMiddleware: RequestHandler = compression({
  // Apenas comprimir respostas maiores que 1KB
  threshold: 1024,

  // Nível de compressão (6 é um bom equilíbrio)
  level: 6,

  // Filtro de conteúdo para compressão
  filter: (req: Request, res: Response) => {
    // Não comprimir se cliente não suporta
    if (req.headers["x-no-compression"]) {
      return false;
    }

    // Não comprimir para SSE/WebSocket
    if (
      req.headers.accept &&
      req.headers.accept.includes("text/event-stream")
    ) {
      return false;
    }

    // Usar filtro padrão do compression
    return compression.filter(req, res);
  },

  // Configurações avançadas
  memLevel: 8, // Memoria para compressão (padrão: 8)
  chunkSize: 16 * 1024, // 16KB chunks
});

// Middleware para response caching headers
export const cacheHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Headers para métodos GET
  if (req.method === "GET") {
    // Cache público para assets estáticos
    if (
      req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
    ) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // 1 ano
      res.setHeader(
        "Expires",
        new Date(Date.now() + 31536000000).toUTCString(),
      );
    }
    // Cache moderado para API endpoints
    else if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "private, max-age=300"); // 5 minutos
      res.setHeader("ETag", `"${Date.now()}"`);
    }
  }

  // Headers de segurança para cache
  res.setHeader("Vary", "Accept-Encoding, Authorization");

  next();
};

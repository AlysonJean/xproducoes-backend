import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import * as dotenv from "dotenv";
import { dynamicCors } from "./config/cors";
import apiV1 from "./api/v1";
import cepRoutes from './routes/cepRoutes';
import { securityMonitoringMiddleware } from "./config/securityMonitor";

dotenv.config();

const app = express();

// CORS middleware
app.use(dynamicCors);

// Segurança
app.use(helmet());
// Cabeçalhos de segurança adicionais (CSP gerido aqui para maior controle)
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  next();
});
// Logs
app.use(morgan("dev"));
// Rate limiting
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  }),
);

// Monitoramento de segurança
app.use(securityMonitoringMiddleware);

// Servir arquivos estáticos para manifest e service worker (produção)
if (process.env.NODE_ENV === "production") {
  const path = require("path");
  app.use(express.static(path.join(__dirname, "../public")));
  app.get("/manifest.webmanifest", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/manifest.webmanifest"));
  });
  app.get("/service-worker.js", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/service-worker.js"));
  });
}

// Removido: não servimos uploads locais (Cloudinary apenas)
// Body parser
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || "10mb" }));
app.use(express.urlencoded({ extended: true }));
// Versionamento de API
app.use('/api/cep', cepRoutes);
app.use("/api/v1", apiV1);
app.use("/api", apiV1); // Compatibilidade para testes e frontend
// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// 404 handler
import { allowedOrigins } from "./config/cors";
app.use((req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
     res.header(
       "Access-Control-Allow-Headers",
       "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key, x-svg-proxy-token",
     );
  }
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    message: "Rota inválida",
    data: null,
  });
});

// Error handler global
import { Request, Response, NextFunction } from "express";
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
     res.header(
       "Access-Control-Allow-Headers",
       "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key, x-svg-proxy-token",
     );
  }
  console.error("Erro global:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Erro interno",
    message: "Erro interno do servidor",
    data: null,
  });
});

export default app;

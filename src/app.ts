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
  "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key",
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
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key",
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

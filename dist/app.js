"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv = __importStar(require("dotenv"));
const cors_1 = require("./config/cors");
const v1_1 = __importDefault(require("./api/v1"));
const cepRoutes_1 = __importDefault(require("./routes/cepRoutes"));
dotenv.config();
const app = (0, express_1.default)();
// CORS middleware
app.use(cors_1.dynamicCors);
// Segurança
app.use((0, helmet_1.default)());
// Logs
app.use((0, morgan_1.default)("dev"));
// Rate limiting
app.use((0, express_rate_limit_1.default)({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
}));
// Servir arquivos estáticos para manifest e service worker (produção)
if (process.env.NODE_ENV === "production") {
    const path = require("path");
    app.use(express_1.default.static(path.join(__dirname, "../public")));
    app.get("/manifest.webmanifest", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/manifest.webmanifest"));
    });
    app.get("/service-worker.js", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/service-worker.js"));
    });
}
// Removido: não servimos uploads locais (Cloudinary apenas)
// Body parser
app.use(express_1.default.json({ limit: process.env.MAX_FILE_SIZE || "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Versionamento de API
app.use('/api/cep', cepRoutes_1.default);
app.use("/api/v1", v1_1.default);
app.use("/api", v1_1.default); // Compatibilidade para testes e frontend
// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});
// 404 handler
const cors_2 = require("./config/cors");
app.use((req, res) => {
    const origin = req.headers.origin;
    if (origin && cors_2.allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key");
    }
    res.status(404).json({
        success: false,
        error: "Endpoint não encontrado",
        message: "Rota inválida",
        data: null,
    });
});
app.use((err, req, res, next) => {
    const origin = req.headers.origin;
    if (origin && cors_2.allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Idempotency-Key");
    }
    console.error("Erro global:", err);
    res.status(500).json({
        success: false,
        error: err.message || "Erro interno",
        message: "Erro interno do servidor",
        data: null,
    });
});
exports.default = app;

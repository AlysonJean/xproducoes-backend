"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheHeadersMiddleware = exports.compressionMiddleware = void 0;
const compression_1 = __importDefault(require("compression"));
// Compression middleware com configurações otimizadas
exports.compressionMiddleware = (0, compression_1.default)({
    // Apenas comprimir respostas maiores que 1KB
    threshold: 1024,
    // Nível de compressão (6 é um bom equilíbrio)
    level: 6,
    // Filtro de conteúdo para compressão
    filter: (req, res) => {
        // Não comprimir se cliente não suporta
        if (req.headers["x-no-compression"]) {
            return false;
        }
        // Não comprimir para SSE/WebSocket
        if (req.headers.accept &&
            req.headers.accept.includes("text/event-stream")) {
            return false;
        }
        // Usar filtro padrão do compression
        return compression_1.default.filter(req, res);
    },
    // Configurações avançadas
    memLevel: 8, // Memoria para compressão (padrão: 8)
    chunkSize: 16 * 1024, // 16KB chunks
});
// Middleware para response caching headers
const cacheHeadersMiddleware = (req, res, next) => {
    // Headers para métodos GET
    if (req.method === "GET") {
        // Cache público para assets estáticos
        if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // 1 ano
            res.setHeader("Expires", new Date(Date.now() + 31536000000).toUTCString());
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
exports.cacheHeadersMiddleware = cacheHeadersMiddleware;

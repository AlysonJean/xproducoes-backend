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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDiagnostics = runDiagnostics;
exports.runDiagnosticsLegacy = runDiagnosticsLegacy;
async function runDiagnostics() {
    const results = [];
    // Teste de conectividade com banco de dados
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../config/prisma")));
        const start = Date.now();
        await prisma.$queryRaw `SELECT 1`;
        const responseTime = Date.now() - start;
        results.push({
            service: "database",
            status: "healthy",
            message: "Conexão com banco de dados OK",
            timestamp: new Date(),
            responseTime,
        });
    }
    catch (error) {
        results.push({
            service: "database",
            status: "unhealthy",
            message: `Erro na conexão: ${error}`,
            timestamp: new Date(),
        });
    }
    // Teste de memória
    const memUsage = process.memoryUsage();
    const memoryStatus = memUsage.heapUsed < 500 * 1024 * 1024 ? "healthy" : "unhealthy";
    results.push({
        service: "memory",
        status: memoryStatus,
        message: `Uso de memória: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        timestamp: new Date(),
    });
    // Teste de uptime
    const uptimeSeconds = process.uptime();
    results.push({
        service: "uptime",
        status: "healthy",
        message: `Servidor ativo há ${Math.round(uptimeSeconds)}s`,
        timestamp: new Date(),
    });
    return results;
}
// Função legada para compatibilidade
function runDiagnosticsLegacy() {
    return {
        timestamp: new Date().toISOString(),
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        },
        database: {
            status: "connected",
            latency: "low"
        },
        services: {
            email: "operational",
            uploads: "operational",
            cache: "operational"
        }
    };
}

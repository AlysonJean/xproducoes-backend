// Diagnósticos do Sistema
export interface DiagnosticResult {
  service: string;
  status: "healthy" | "unhealthy";
  message: string;
  timestamp: Date;
  responseTime?: number;
}

export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Teste de conectividade com banco de dados
  try {
    const { prisma } = await import("../config/prisma");
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    results.push({
      service: "database",
      status: "healthy",
      message: "Conexão com banco de dados OK",
      timestamp: new Date(),
      responseTime,
    });
  } catch (error) {
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
export function runDiagnosticsLegacy() {
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

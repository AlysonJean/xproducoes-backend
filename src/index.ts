
import app from "./app";
import { securityMonitor } from "./config/securityMonitor";
import { prisma } from "./config/prisma";
import http from "http";

const PORT = Number(process.env.PORT) || 3001;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});

const gracefulShutdown = async (signal?: string) => {
  console.log(`Recebido sinal ${signal || 'shutdown'} - encerrando a API...`);
  try {
    // Parar timers e limpeza interna
    try { securityMonitor.stop(); } catch (e) { /* ignore */ }

    // Fechar servidor HTTP para novas conexões
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });

    // Desconectar Prisma
    try { await prisma.$disconnect(); } catch (e) { /* ignore */ }

    console.log('Encerramento gracioso concluído.');
    process.exit(0);
  } catch (err) {
    console.error('Erro durante o shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Em ambientes Windows PowerShell onde sinais podem não ser enviados, expor uma rota/handler opcional

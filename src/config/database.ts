import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import logger from './logger';

// Carregar variáveis de ambiente primeiro
dotenv.config();

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for database connection
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ['error'], // Nível de log para produção
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn'], // Reduzido para evitar spam de logs
    });
  }
  prisma = global.__prisma;
}

// Conectar explicitamente ao banco (apenas tentar, não sair do processo)
prisma.$connect().catch((error) => {
  logger.error({ err: error }, 'FATAL: Erro ao conectar com o banco de dados');
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});
// Graceful shutdown managed by application entry point
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };
export default prisma;

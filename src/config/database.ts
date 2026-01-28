import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

// Carregar variáveis de ambiente primeiro
dotenv.config();

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for database connection
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ['error'],
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
  console.error('Erro ao conectar com o banco de dados:', error);
  console.warn('Continuando sem conexão com banco - algumas funcionalidades podem não funcionar');
});
// Graceful shutdown managed by application entry point
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };
export default prisma;

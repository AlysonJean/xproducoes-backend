import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// Carregar variáveis de ambiente primeiro
dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for database connection
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    adapter,
    log: ['error'], // Nível de log para produção
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'], // Reduzido para evitar spam de logs
    });
  }
  prisma = global.__prisma;
}

// Conectar explicitamente ao banco (apenas tentar, não sair do processo)
prisma.$connect().catch((error) => {
  console.error('FATAL: Erro ao conectar com o banco de dados:', error);
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

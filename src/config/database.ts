import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import logger from './logger';

// Carregar variáveis de ambiente primeiro
dotenv.config();

const connectionString = process.env.DATABASE_URL;

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for database connection
// Configurando limite hard max para Pool (Neon Free Tier restringe chamadas concorrentes)
const POOL_MAX_CONNECTIONS = process.env.DB_MAX_CONNECTIONS 
  ? parseInt(process.env.DB_MAX_CONNECTIONS) 
  : 10;

if (process.env.NODE_ENV === "production") {
  const pool = new Pool({ 
    connectionString, 
    max: POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000 
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({
    adapter,
    log: ['error'], // Nível de log para produção
  });
} else {
  if (!global.__prisma) {
    const pool = new Pool({ 
      connectionString,
      max: POOL_MAX_CONNECTIONS,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000 
    });
    const adapter = new PrismaPg(pool);
    global.__prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'], // Reduzido para evitar spam de logs
    });
  }
  prisma = global.__prisma;
}

// Conectar ao banco com retry (resiliência para Docker/Kubernetes)
async function connectWithRetry(attempts = 1) {
  const MAX_ATTEMPTS = 5;
  const DELAY = attempts * 2000; // exponential backoff

  try {
    await prisma.$connect();
    logger.info('✅ Banco de dados conectado com sucesso');
  } catch (error) {
    if (attempts >= MAX_ATTEMPTS) {
      logger.error({ err: error }, `❌ Erro fatal após ${MAX_ATTEMPTS} tentativas de conexão`);
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    } else {
      logger.warn(`⚠️ Falha na conexão (tentativa ${attempts}/${MAX_ATTEMPTS}). Retentando em ${DELAY}ms...`);
      setTimeout(() => connectWithRetry(attempts + 1), DELAY);
    }
  }
}

connectWithRetry();
// Graceful shutdown managed by application entry point
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };
export default prisma;

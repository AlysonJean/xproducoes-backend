"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
let prisma;
// Singleton pattern for database connection
if (process.env.NODE_ENV === "production") {
    exports.prisma = prisma = new client_1.PrismaClient({
        log: ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
}
else {
    if (!global.__prisma) {
        global.__prisma = new client_1.PrismaClient({
            log: ['error', 'warn'], // Reduzido para evitar spam de logs
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
        });
    }
    exports.prisma = prisma = global.__prisma;
}
// Conectar explicitamente ao banco
prisma.$connect().catch((error) => {
    console.error('Erro ao conectar com o banco de dados:', error);
    process.exit(1);
});
// Handle graceful shutdown
const gracefulShutdown = async () => {
    console.log('Desconectando do banco de dados...');
    await prisma.$disconnect();
    process.exit(0);
};
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});
exports.default = prisma;

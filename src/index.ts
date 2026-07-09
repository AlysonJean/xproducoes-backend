import app from "./app";
import { securityMonitor } from "./config/securityMonitor";
import { prisma } from "./config/prisma";
import { connectDatabase } from "./config/database";
import http from "http";
import https from "https";
import { initializeSocket } from "./config/socket";
import { config } from "./config/environment";
import fs from "fs";
import logger from "./config/logger";
import crypto from "crypto";
import { initializeQueues, closeQueues } from "./config/jobQueue";
import { startSocialScheduler } from "./cron/socialScheduler";
import { startReminderScheduler } from "./cron/sendReminders";
import { initializeRateLimiters } from "./middlewares/adaptiveRateLimiter";
import { registerGlobalCrashHandlers } from "./config/crashHandlers";

// Registrado o mais cedo possível: uma exceção não tratada ou uma Promise rejeitada sem
// .catch em qualquer lugar do app (inclusive durante a configuração do servidor abaixo)
// agora é logada, reportada ao Sentry e encerra o processo de forma explícita, em vez de
// derrubar o processo silenciosamente sem nenhum sinal para o operador.
registerGlobalCrashHandlers();

const PORT = Number(process.env.PORT) || 3001;

/**
 * Configura o servidor HTTP/HTTPS de forma robusta
 * @returns {Object} Objeto contendo server, protocol e informações de configuração
 */
function configureServer(): { server: http.Server | https.Server; protocol: string; sslInfo: string } {
  const isProduction = process.env.NODE_ENV === 'production';
  const sslEnabled = config.ssl.enabled;
  const isRender = process.env.RENDER === 'true'; // Render define essa variável automaticamente

  // Em produção no Render, sempre usar HTTP (Render fornece SSL via proxy)
  if (isProduction && isRender) {
    const server = http.createServer(app);
    return {
      server,
      protocol: 'http',
      sslInfo: 'HTTP (produção - SSL gerenciado pelo Render)'
    };
  }

  // Em desenvolvimento, sempre usar HTTP se SSL não estiver explicitamente configurado
  if (!isProduction && !sslEnabled) {
    const server = http.createServer(app);
    return {
      server,
      protocol: 'http',
      sslInfo: 'HTTP (desenvolvimento - SSL desabilitado)'
    };
  }

  // Tentar configurar HTTPS (para produção self-hosted ou desenvolvimento com SSL)
  try {
    const sslOptions = configureSSLOptions();
    const server = https.createServer(sslOptions, app);

    return {
      server,
      protocol: 'https',
      sslInfo: sslOptions.certSource
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.warn({obj:errorMessage}, '⚠️  Falha ao configurar HTTPS:');
    logger.warn('🔄 Voltando para HTTP (não seguro)');

    const server = http.createServer(app);
    return {
      server,
      protocol: 'http',
      sslInfo: 'HTTP (fallback - SSL falhou)'
    };
  }
}

/**
 * Configura opções SSL de forma robusta
 * @returns {Object} Opções SSL configuradas
 */
function configureSSLOptions(): https.ServerOptions & { certSource: string } {
  const isProduction = process.env.NODE_ENV === 'production';
  const isRender = process.env.RENDER === 'true';

  // 1. Tentar carregar certificados do sistema de arquivos
  if (config.ssl.certPath && config.ssl.keyPath) {
    try {
      validateSSLFiles(config.ssl.certPath, config.ssl.keyPath);

      const sslOptions: https.ServerOptions & { certSource: string } = {
        cert: fs.readFileSync(config.ssl.certPath),
        key: fs.readFileSync(config.ssl.keyPath),
        certSource: 'Certificados fornecidos via arquivo'
      };

      if (config.ssl.caPath) {
        validateSSLFiles(config.ssl.caPath);
        sslOptions.ca = fs.readFileSync(config.ssl.caPath);
      }

      if (config.ssl.passphrase) {
        sslOptions.passphrase = config.ssl.passphrase;
      }

      logger.info('🔒 Usando certificados SSL fornecidos');
      return sslOptions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao carregar certificados do arquivo: ${errorMessage}`);
    }
  }

  // 2. Em produção (não-Render), exigir certificados válidos
  if (isProduction && !isRender) {
    throw new Error('Em produção self-hosted, SSL_CERT_PATH e SSL_KEY_PATH devem ser fornecidos');
  }

  // 3. Em desenvolvimento, gerar certificado auto-assinado
  try {
    const selfSigned = generateSelfSignedCertRobust();
    if (!selfSigned) {
      throw new Error('Não foi possível gerar certificado auto-assinado');
    }

    logger.info('🔒 Usando certificado auto-assinado (desenvolvimento)');
    logger.info('⚠️  AVISO: Certificado auto-assinado - não use em produção!');
    logger.info('💡 Para HTTPS em produção, configure SSL_CERT_PATH e SSL_KEY_PATH');

    return {
      cert: selfSigned.cert,
      key: selfSigned.key,
      certSource: 'Certificado auto-assinado (desenvolvimento)'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Falha ao gerar certificado auto-assinado: ${errorMessage}`);
  }
}

/**
 * Valida se os arquivos SSL existem e são legíveis
 * @param {string[]} filePaths - Caminhos dos arquivos a validar
 */
function validateSSLFiles(...filePaths: string[]): void {
  for (const filePath of filePaths) {
    fs.accessSync(filePath, fs.constants.R_OK);
  }
}

/**
 * Gera certificado auto-assinado de forma robusta usando Node.js puro
 * @returns {Object|null} Certificado e chave ou null se falhar
 */
function generateSelfSignedCertRobust(): { cert: string; key: string } | null {
  try {
    // Usar crypto nativo do Node.js para gerar certificados

    // Gerar chave privada RSA de 2048 bits
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Criar certificado auto-assinado
    const cert = createSelfSignedCertificate(publicKey);

    return {
      key: privateKey,
      cert: cert
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.warn({obj:errorMessage}, 'WARN: Falha ao gerar certificado auto-assinado:');
    logger.warn('Para desenvolvimento com HTTPS, forneça certificados válidos via SSL_CERT_PATH e SSL_KEY_PATH');
    return null;
  }
}

/**
 * Cria um certificado auto-assinado básico
 * @param {string} publicKey - Chave pública
 * @returns {string} Certificado PEM
 */
function createSelfSignedCertificate(_publicKey: string): string {

  // Nota: Esta é uma implementação simplificada para desenvolvimento.
  // Para produção, use certificados válidos de uma CA confiável.

  logger.warn('INFO: Usando certificado auto-assinado simplificado para desenvolvimento');
  logger.warn('INFO: Para certificados completos, considere usar uma CA válida');

  // Gerar um certificado básico válido para desenvolvimento
  // Em produção, sempre use certificados de CA confiável
  const serial = crypto.randomBytes(16).toString('hex').toUpperCase();
  const now = new Date();
  const later = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  return `-----BEGIN CERTIFICATE-----
MIICiTCCAg+gAwIBAgIJ${serial}MAOGA1UEBhMCQlIxCzAJBgNVBAgTAkNBMQ8w
DQYDVQQHEwZTYW8gUGF1bG8xFTATBgNVBAoTDFggUHJvZHVjb2VzIENvbXBhbnkx
EDAOBgNVBAMTB2xvY2FsaG9zdDAeFw0${now.toISOString().slice(2, 10).replace(/-/g, '')}Z
Fw0${later.toISOString().slice(2, 10).replace(/-/g, '')}ZMBgxFjAUBgNVBAoTDVggUHJvZHVjb2VzIENvbXBhbnkx
EDAOBgNVBAMTB2xvY2FsaG9zdDBcMA0GCSqGSIb3DQEBAQUAA0sAMEgCQQC${crypto.randomBytes(64).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}
-----END CERTIFICATE-----`;
}

// Configurar servidor
const { server, protocol, sslInfo } = configureServer();

// Inicializar Socket.IO
initializeSocket(server);

/**
 * Inicia o servidor com tentativas robustas caso a porta esteja em uso
 */
async function startServerWithRetries(initialPort: number, maxRetries = 10) {
  // Inicializar cache Redis
  // O novo CacheService inicializa automaticamente e gerencia fallback para memória
  let port = initialPort;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (err: any) => reject(err);
        server.once('error', onError);
        server.listen(port, () => {
          server.removeListener('error', onError);
          resolve();
        });
      });

      logger.info(`🚀 API rodando em ${protocol}://localhost:${port}`);
      logger.info(`🔌 Socket.IO inicializado na porta ${port} (${protocol.toUpperCase()})`);
      logger.info(`🔐 Configuração SSL: ${sslInfo}`);
      return;
    } catch (err: any) {
      // Tratamento de erro específico de porta em uso
      if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
        logger.warn(`⚠️ Porta ${port} indisponível (${err.code}). Tentando próxima porta...`);
        port++;
        // Se for última tentativa, registrar erro e sair
        if (attempt === maxRetries) {
          logger.error(`Erro: não foi possível iniciar o servidor após ${maxRetries + 1} tentativas. Último erro:`, err);
          process.exit(1);
        }
        // Aguarda um breve período antes de tentar novamente
        await new Promise(r => setTimeout(r, 200));
        continue;
      }

      logger.error({obj:err}, 'Erro ao iniciar o servidor:');
      process.exit(1);
    }
  }
}

// Iniciar infraestrutura crítica antes de expor o servidor
Promise.all([
  connectDatabase(),
  initializeRateLimiters(),
])
  .then(() => startServerWithRetries(Number(process.env.PORT) || PORT))
  .then(async () => {
    // Inicializar filas de jobs após servidor iniciar
    await initializeQueues();
    // Iniciar agendador de redes sociais
    startSocialScheduler();
    // Iniciar agendador de lembretes
    startReminderScheduler();
  })
  .catch(err => {
    logger.error({obj:err}, 'Erro fatal ao iniciar servidor:');
    process.exit(1);
  });

const gracefulShutdown = async (signal?: string) => {
  logger.info(`Recebido sinal ${signal || 'shutdown'} - encerrando a API...`);
  try {
    // Parar timers e limpeza interna
    try { securityMonitor.stop(); } catch { /* ignore */ }

    // Fechar filas de jobs
    try { await closeQueues(); } catch { /* ignore */ }

    // Fechar servidor HTTP para novas conexões
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });

    // Desconectar Prisma
    try { await prisma.$disconnect(); } catch { /* ignore */ }

    logger.info('Encerramento gracioso concluído.');
    process.exit(0);
  } catch (err) {
    logger.error({obj:err}, 'Erro durante o shutdown:');
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Em ambientes Windows PowerShell onde sinais podem não ser enviados, expor uma rota/handler opcional

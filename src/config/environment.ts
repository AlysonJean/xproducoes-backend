// Configuração centralizada para variáveis de ambiente seguras
import logger from './logger';

function required(name: string, value: string | undefined) {
  if (!value) {
    // In production, JWT_SECRET and other sensitive values must be provided.
    if (process.env.NODE_ENV === 'production') {
      logger.error({ envVar: name }, 'FATAL: ambiente necessário não definido');
      process.exit(1);
    }

    // In non-production environments, generate a ephemeral secret for developer convenience
    const ephemeral = require('crypto').randomBytes(64).toString('hex');
    logger.warn({ envVar: name }, 'Variável não definida. Gerando valor efêmero para ambiente de desenvolvimento');
    return ephemeral;
  }
  return value;
}

export const config = {
  jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),
  databaseUrl: required('DATABASE_URL', process.env.DATABASE_URL),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || undefined,
    apiKey: process.env.CLOUDINARY_API_KEY || undefined,
    apiSecret: process.env.CLOUDINARY_API_SECRET || undefined,
  },
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  smtp: {
    host: process.env.SMTP_HOST || undefined,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
  },
  ssl: {
    enabled: (process.env.HTTPS_ENABLED === 'true' || process.env.NODE_ENV === 'production') && process.env.RENDER !== 'true',
    keyPath: process.env.SSL_KEY_PATH || undefined,
    certPath: process.env.SSL_CERT_PATH || undefined,
    caPath: process.env.SSL_CA_PATH || undefined,
    passphrase: process.env.SSL_PASSPHRASE || undefined,
  },
};

// Verificações rápidas de variáveis críticas (falhar em produção apenas para essenciais)
function validateCritical() {
  const missing: string[] = [];
  const criticalMissing: string[] = [];

  // Verificar apenas variáveis realmente críticas
  if (!config.databaseUrl) criticalMissing.push('DATABASE_URL');
  if (!config.jwtSecret) criticalMissing.push('JWT_SECRET');

  // Verificar SSL em produção (exceto no Render que fornece SSL via proxy)
  const isRender = process.env.RENDER === 'true';
  if (process.env.NODE_ENV === 'production' && config.ssl.enabled && !isRender) {
    if (!config.ssl.certPath || !config.ssl.keyPath) {
      criticalMissing.push('SSL_CERT_PATH and SSL_KEY_PATH (required for HTTPS in production)');
    }
  }

  // Outras variáveis são recomendadas mas não críticas
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    missing.push('CLOUDINARY_* (recomendado para upload de imagens)');
  }
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    missing.push('SMTP_* (recomendado para envio de emails)');
  }

  if (process.env.NODE_ENV === 'production' && criticalMissing.length > 0) {
    logger.error({ vars: criticalMissing }, 'FATAL: Missing critical environment variables');
    process.exit(1);
  }

  if (missing.length > 0) {
    logger.warn({ vars: missing }, 'Missing recommended environment variables');
  }

  if (criticalMissing.length > 0) {
    logger.warn({ vars: criticalMissing }, 'Missing critical environment variables (development mode)');
  }
}

validateCritical();

// Função para gerar certificados auto-assinados para desenvolvimento
export function generateSelfSignedCert() {
  const crypto = require('crypto');
  const { execSync } = require('child_process');

  try {
    // Gerar chave privada
    const key = crypto.generateKeyPairSync('rsa', {
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

    // Gerar certificado auto-assinado
    const cert = execSync(`
      openssl req -new -x509 -days 365 -nodes -key /dev/stdin -subj "/C=BR/ST=SP/L=Sao Paulo/O=X Produçoes/CN=localhost" -out /dev/stdout
    `, {
      input: key.privateKey,
      encoding: 'utf8'
    });

    return {
      key: key.privateKey,
      cert: cert
    };
  } catch {
    logger.warn('Falha ao gerar certificado auto-assinado. Usando HTTP apenas. Para desenvolvimento com HTTPS, instale OpenSSL ou forneça certificados válidos.');
    return null;
  }
}

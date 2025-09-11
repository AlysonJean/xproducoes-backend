// Configuração centralizada para variáveis de ambiente seguras

function required(name: string, value: string | undefined) {
  if (!value) {
    // In production, JWT_SECRET and other sensitive values must be provided.
    if (process.env.NODE_ENV === 'production') {
      console.error(`FATAL: ambiente necessário não definido: ${name}`);
      process.exit(1);
    }

    // In non-production environments, generate a ephemeral secret for developer convenience
    const ephemeral = require('crypto').randomBytes(64).toString('hex');
    console.warn(`WARN: ${name} não definido. Gerando valor efêmero para ambiente de desenvolvimento.`);
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
};

// Verificações rápidas de variáveis críticas (falhar em produção apenas para essenciais)
function validateCritical() {
  const missing: string[] = [];
  const criticalMissing: string[] = [];

  // Verificar apenas variáveis realmente críticas
  if (!config.databaseUrl) criticalMissing.push('DATABASE_URL');
  if (!config.jwtSecret) criticalMissing.push('JWT_SECRET');

  // Outras variáveis são recomendadas mas não críticas
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    missing.push('CLOUDINARY_* (recomendado para upload de imagens)');
  }
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    missing.push('SMTP_* (recomendado para envio de emails)');
  }

  if (process.env.NODE_ENV === 'production' && criticalMissing.length > 0) {
    console.error('FATAL: Missing critical environment variables:', criticalMissing.join('; '));
    process.exit(1);
  }

  if (missing.length > 0) {
    console.warn('WARN: Missing recommended environment variables:', missing.join('; '));
  }

  if (criticalMissing.length > 0) {
    console.warn('WARN: Missing critical environment variables (development mode):', criticalMissing.join('; '));
  }
}

validateCritical();

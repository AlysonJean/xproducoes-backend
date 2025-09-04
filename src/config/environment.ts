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

// Verificações rápidas de variáveis críticas (falhar em produção)
function validateCritical() {
  const missing: string[] = [];
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    missing.push('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  }
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    missing.push('SMTP_HOST, SMTP_USER, SMTP_PASS');
  }
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (process.env.NODE_ENV === 'production' && missing.length > 0) {
    console.error('FATAL: Missing critical environment variables:', missing.join('; '));
    process.exit(1);
  }
  if (missing.length > 0) {
    console.warn('WARN: Missing recommended environment variables:', missing.join('; '));
  }
}

validateCritical();

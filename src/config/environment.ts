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

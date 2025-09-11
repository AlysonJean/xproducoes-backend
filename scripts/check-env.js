#!/usr/bin/env node

/**
 * 🔍 VERIFICADOR DE VARIÁVEIS DE AMBIENTE PARA DEPLOY
 * Executa antes do deploy para garantir que todas as credenciais estão configuradas
 */

const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'STRIPE_SECRET_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const optionalVars = [
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'FRONTEND_URL'
];

console.log('🔍 Verificando variáveis de ambiente para deploy...\n');

let allRequired = true;
let warnings = [];

console.log('📋 VARIÁVEIS OBRIGATÓRIAS:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Configurada`);
  } else {
    console.log(`❌ ${varName}: NÃO CONFIGURADA`);
    allRequired = false;
  }
});

console.log('\n📋 VARIÁVEIS OPCIONAIS:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Configurada`);
  } else {
    console.log(`⚠️  ${varName}: Não configurada (opcional)`);
    warnings.push(`${varName} não configurada - funcionalidades podem não funcionar`);
  }
});

console.log('\n🌍 AMBIENTE:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
if (process.env.NODE_ENV !== 'production') {
  warnings.push('NODE_ENV não está como production');
}

console.log('\n' + '='.repeat(50));

if (allRequired) {
  console.log('🎉 Todas as variáveis obrigatórias estão configuradas!');
  console.log('🚀 Pronto para deploy!');
} else {
  console.log('❌ Faltam variáveis obrigatórias!');
  console.log('🔧 Configure as variáveis faltantes antes do deploy.');
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('\n⚠️  AVISOS:');
  warnings.forEach(warning => console.log(`   - ${warning}`));
}

console.log('\n💡 Para configurar no Render/Vercel:');
console.log('   1. Acesse o dashboard da plataforma');
console.log('   2. Vá em Environment Variables');
console.log('   3. Adicione cada variável listada acima');
console.log('   4. Para Redis: copie dos valores do Upstash');

console.log('\n🔗 Links úteis:');
console.log('   Render: https://dashboard.render.com');
console.log('   Vercel: https://vercel.com/dashboard');
console.log('   Upstash: https://console.upstash.com');

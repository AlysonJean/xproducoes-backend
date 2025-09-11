/**
 * 🧪 TESTE DO SISTEMA DE CACHE
 * Verifica se o cache está funcionando corretamente
 */

import 'dotenv/config'; // Carregar variáveis de ambiente
import Redis from 'ioredis';

async function testCacheSystem() {
  console.log('🚀 Testando sistema de cache...\n');

  // Verificar ambiente
  const isProduction = process.env.NODE_ENV === 'production';
  console.log('🌍 Ambiente:', isProduction ? '🟢 PRODUÇÃO' : '🟡 DESENVOLVIMENTO');

  // Verificar se as variáveis estão carregadas
  console.log('\n🔍 Verificando variáveis de ambiente...');
  console.log('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ Configurada' : '❌ Não encontrada');
  console.log('UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Configurada' : '❌ Não encontrada');

  if (!isProduction) {
    console.log('\n🏠 MODO DESENVOLVIMENTO DETECTADO');
    console.log('💡 Redis será desabilitado para economia de recursos');
    console.log('📊 Usando apenas cache em memória local');
    console.log('\n✅ Teste concluído - cache em memória ativo');
    console.log('\n💰 Economia: Não gasta recursos Redis em desenvolvimento');
    console.log('⚡ Performance: Cache em memória é suficiente para dev');
    return;
  }

  console.log('\n🏭 MODO PRODUÇÃO DETECTADO');
  console.log('🚀 Ativando cache Redis...');

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;

  if (!redisUrl) {
    console.log('\n❌ UPSTASH_REDIS_REST_URL não encontrada!');
    console.log('💡 Configure a URL do Redis no arquivo .env para produção');
    console.log('🔄 Sistema usará cache em memória como fallback');
    return;
  }

  console.log('\n🔗 Conectando ao Redis...');
  console.log('URL:', redisUrl.replace(/https:\/\/([^.]+)\..*/, 'https://$1...')); // Ocultar parte da URL por segurança

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 15000,
      commandTimeout: 10000,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      family: 4,
      tls: {
        rejectUnauthorized: true
      }
    });

    // Adicionar logs de debug
    redis.on('ready', () => {
      console.log('🔄 Redis ready event');
    });

    redis.on('connect', () => {
      console.log('✅ Redis connect event');
    });

    redis.on('error', (error) => {
      console.log('❌ Redis error event:', error.message);
    });

    redis.on('close', () => {
      console.log('🔌 Redis close event');
    });

    console.log('⏳ Tentando conectar...');
    await redis.connect();

    console.log('✅ Redis conectado com sucesso!');

    // Teste rápido
    console.log('\n🧪 Executando teste de leitura/escrita...');
    await redis.set('test:connection', 'OK');
    const result = await redis.get('test:connection');
    await redis.del('test:connection');

    if (result === 'OK') {
      console.log('🎉 Redis funcionando perfeitamente!');
      console.log('📊 Cache Redis está ativo no sistema');
      console.log('\n💡 Agora você pode:');
      console.log('   - Iniciar o servidor: npm run dev');
      console.log('   - Verificar cache: curl http://localhost:4000/api/health/cache');
      console.log('   - Monitorar no Upstash: https://console.upstash.com/');
    } else {
      console.log('⚠️ Teste de leitura/escrita falhou');
    }

    await redis.quit();

  } catch (error) {
    console.log('\n❌ Falha na conexão Redis:', error.message);
    console.log('\n🔧 Possíveis soluções:');
    console.log('1. Verifique se a URL está correta');
    console.log('2. Teste a conexão no dashboard Upstash');
    console.log('3. Verifique se a região está acessível');
    console.log('4. Sistema usará cache em memória como fallback');
  }
}

testCacheSystem().catch(console.error);

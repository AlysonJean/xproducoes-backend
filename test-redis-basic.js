/**
 * 🧪 TESTE BÁSICO DO REDIS
 * Teste simples para verificar conexão Redis
 */

import Redis from 'ioredis';

async function testRedis() {
  console.log('🚀 Testando conexão Redis...\n');

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

  if (!redisUrl) {
    console.log('⚠️ Nenhuma URL Redis configurada. Usando cache em memória.');
    console.log('💡 Para testar Redis, configure REDIS_URL ou UPSTASH_REDIS_REST_URL');
    return;
  }

  console.log('🔗 Tentando conectar ao Redis...');

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
    });

    // Aguardar conexão
    await new Promise((resolve, reject) => {
      redis.on('connect', () => {
        console.log('✅ Conexão Redis estabelecida!');
        resolve(true);
      });

      redis.on('error', (error) => {
        console.log('❌ Erro na conexão Redis:', error.message);
        reject(error);
      });

      // Timeout
      setTimeout(() => {
        reject(new Error('Timeout na conexão'));
      }, 5000);
    });

    // Teste básico
    console.log('\n🧪 Executando testes básicos...');

    // SET
    await redis.set('test:key', 'Hello from X-Produções!');
    console.log('✅ SET: OK');

    // GET
    const value = await redis.get('test:key');
    console.log('✅ GET:', value);

    // DEL
    await redis.del('test:key');
    console.log('✅ DEL: OK');

    // KEYS
    const keys = await redis.keys('*');
    console.log('📊 Total de chaves:', keys.length);

    // INFO
    const info = await redis.info('memory');
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    console.log('📈 Memória usada:', memoryMatch ? memoryMatch[1] : 'N/A');

    await redis.quit();
    console.log('\n🎉 Todos os testes Redis passaram!');

  } catch (error) {
    console.log('❌ Falha no teste Redis:', error.message);
    console.log('💡 Sistema usará cache em memória como fallback');
  }
}

// Executar teste
testRedis().catch(console.error);

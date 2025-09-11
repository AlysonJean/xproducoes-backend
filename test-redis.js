/**
 * 🧪 TESTE RÁPIDO DO REDIS
 * Verifica se a conexão Redis está funcionando
 */

import Redis from 'ioredis';

async function testRedisConnection() {
  console.log('🚀 Testando conexão Redis...\n');

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

  if (!redisUrl) {
    console.log('❌ Nenhuma URL Redis configurada!');
    console.log('💡 Configure UPSTASH_REDIS_REST_URL no arquivo .env');
    console.log('📖 Veja: https://console.upstash.com/');
    return;
  }

  console.log('🔗 Conectando ao Redis...');

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    await new Promise((resolve, reject) => {
      redis.on('connect', () => {
        console.log('✅ Redis conectado com sucesso!');
        resolve(true);
      });

      redis.on('error', (error) => {
        console.log('❌ Erro na conexão:', error.message);
        reject(error);
      });

      setTimeout(() => reject(new Error('Timeout')), 10000);
    });

    // Teste rápido
    await redis.set('test:connection', 'OK');
    const result = await redis.get('test:connection');
    await redis.del('test:connection');

    if (result === 'OK') {
      console.log('🎉 Redis funcionando perfeitamente!');
      console.log('📊 Cache Redis está ativo no sistema');
    }

    await redis.quit();

  } catch (error) {
    console.log('❌ Falha na conexão Redis:', error.message);
    console.log('💡 Verifique suas credenciais no Upstash');
    console.log('🔄 Sistema usará cache em memória');
  }
}

testRedisConnection().catch(console.error);

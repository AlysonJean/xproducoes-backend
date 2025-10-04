import { CacheService } from '../../services/cacheService';

describe('CacheService', () => {
  let cache: CacheService;

  beforeAll(() => {
    cache = CacheService.getInstance();
  });

  afterAll(() => {
    // Limpa intervalos e recursos
    if ((cache as any).cleanupInterval) {
      clearInterval((cache as any).cleanupInterval);
    }
    if (typeof (cache as any).destroy === 'function') {
      (cache as any).destroy();
    }
  });

    it('deve armazenar e recuperar valores do cache em memória', async () => {
      await cache.set('chave_teste', 'valor_teste', 2);
      const valor = await cache.get('chave_teste');
      expect(valor).toBe('valor_teste');
    });

    it('deve remover valores do cache', async () => {
      await cache.set('chave_remover', 'remover', 2);
      await cache.delete('chave_remover');
      const valor = await cache.get('chave_remover');
      expect(valor).toBeNull();
    });

    it('deve expirar valores após o ttl', async () => {
      await cache.set('chave_expira', 'expira', 1);
      await new Promise(r => setTimeout(r, 1100));
      const valor = await cache.get('chave_expira');
      expect(valor).toBeNull();
    });

  it('deve retornar estatísticas do cache', async () => {
    const stats = await cache.getStats();
    expect(stats.memory).toHaveProperty('size');
    expect(Array.isArray(stats.memory.keys)).toBe(true);
  });
});

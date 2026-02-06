import { CacheService } from '../../services/cacheService';

describe('CacheService health/invalidate', () => {
  let cache;
  beforeAll(() => {
    cache = CacheService.getInstance();
  });

  it('deve retornar health check', async () => {
    const result = await cache.healthCheck();
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('environment');
    expect(result).toHaveProperty('memoryConnected', true);
  });

  it('deve invalidar caches de usuário', async () => {
    await expect(cache.invalidateUserCaches('u1')).resolves.toBeUndefined();
  });

  it('deve invalidar caches de booking', async () => {
    await expect(cache.invalidateBookingCaches('b1')).resolves.toBeUndefined();
  });

  it('deve invalidar caches de equipamento', async () => {
    await expect(cache.invalidateEquipmentCaches('e1')).resolves.toBeUndefined();
  });
});

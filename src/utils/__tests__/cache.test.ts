import { cacheService } from '../cache';

describe('CacheService', () => {
  beforeAll(async () => {
    // Conectar apenas se Redis estiver disponível
    try {
      await cacheService.connect();
    } catch (error) {
      console.warn('Redis not available for tests, skipping cache tests');
    }
  });

  afterAll(async () => {
    await cacheService.disconnect();
  });

  it('should set and get a value', async () => {
    const key = 'test-key';
    const value = { message: 'hello' };

    await cacheService.set(key, value);
    const retrieved = await cacheService.get(key);

    expect(retrieved).toEqual(value);
  });

  it('should return null for non-existent key', async () => {
    const retrieved = await cacheService.get('non-existent-key');
    expect(retrieved).toBeNull();
  });

  it('should delete a key', async () => {
    const key = 'delete-test';
    await cacheService.set(key, 'value');
    await cacheService.del(key);
    const retrieved = await cacheService.get(key);
    expect(retrieved).toBeNull();
  });
});
import { CacheService } from '../../services/cacheService';

// Achado (Fase 3): os cron jobs (sendReminders, socialScheduler) só se protegiam contra
// execução concorrente com uma variável booleana local ao processo (`isRunning`), que não
// impede duas instâncias diferentes (ex.: durante um rolling deploy) de rodarem o mesmo
// job ao mesmo tempo — no caso de sendReminders, isso pode enviar o mesmo lembrete em
// duplicidade para o cliente.
describe('CacheService.acquireLock/releaseLock - lock distribuído para cron jobs', () => {
  let cache: CacheService;

  beforeAll(() => {
    cache = CacheService.getInstance();
  });

  it('adquire um lock livre, e uma segunda tentativa concorrente falha enquanto ele estiver ativo', async () => {
    const acquired1 = await cache.acquireLock('test-job-1', 5);
    expect(acquired1).toBe(true);

    const acquired2 = await cache.acquireLock('test-job-1', 5);
    expect(acquired2).toBe(false);

    await cache.releaseLock('test-job-1');
  });

  it('após releaseLock, uma nova tentativa consegue adquirir o lock novamente', async () => {
    await cache.acquireLock('test-job-2', 5);
    await cache.releaseLock('test-job-2');

    const acquiredAgain = await cache.acquireLock('test-job-2', 5);
    expect(acquiredAgain).toBe(true);

    await cache.releaseLock('test-job-2');
  });

  it('locks de chaves diferentes são independentes', async () => {
    const a = await cache.acquireLock('test-job-a', 5);
    const b = await cache.acquireLock('test-job-b', 5);

    expect(a).toBe(true);
    expect(b).toBe(true);

    await cache.releaseLock('test-job-a');
    await cache.releaseLock('test-job-b');
  });

  it('o lock expira sozinho após o TTL (rede de segurança caso o processo trave sem liberar)', async () => {
    await cache.acquireLock('test-job-ttl', 0.05); // 50ms

    const blockedImmediately = await cache.acquireLock('test-job-ttl', 5);
    expect(blockedImmediately).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 120));

    const acquiredAfterExpiry = await cache.acquireLock('test-job-ttl', 5);
    expect(acquiredAfterExpiry).toBe(true);

    await cache.releaseLock('test-job-ttl');
  });
});

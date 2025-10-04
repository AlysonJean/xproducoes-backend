import { runDiagnostics } from '../diagnostics';

describe('runDiagnostics', () => {
  it('deve retornar resultados para database, memory e uptime', async () => {
    const results = await runDiagnostics();
    const services = results.map(r => r.service);
    expect(services).toEqual(expect.arrayContaining(['database', 'memory', 'uptime']));
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it('deve marcar memória como unhealthy se heapUsed for alto', async () => {
    const original = process.memoryUsage;
    process.memoryUsage = () => ({
      ...original(),
      heapUsed: 600 * 1024 * 1024,
      rss: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
    });
    const results = await runDiagnostics();
    const mem = results.find(r => r.service === 'memory');
    expect(mem?.status).toBe('unhealthy');
    process.memoryUsage = original;
  });
});

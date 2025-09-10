import { runDiagnostics, runDiagnosticsLegacy } from '../diagnostics';

describe('runDiagnosticsLegacy', () => {
  it('should return legacy diagnostics object with system info', () => {
    const result = runDiagnosticsLegacy();
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('system');
    expect(result.system).toHaveProperty('nodeVersion');
    expect(result.system).toHaveProperty('platform');
    expect(result.system).toHaveProperty('arch');
    expect(result.system).toHaveProperty('memory');
    expect(result.system).toHaveProperty('uptime');
    expect(result).toHaveProperty('database');
    expect(result).toHaveProperty('services');
  });
});

// Teste para runDiagnostics (mockando prisma e process)
describe('runDiagnostics', () => {
  it('should return diagnostics for memory and uptime', async () => {
    const diagnostics = await runDiagnostics();
    const mem = diagnostics.find(d => d.service === 'memory');
    const uptime = diagnostics.find(d => d.service === 'uptime');
    expect(mem).toBeDefined();
    expect(uptime).toBeDefined();
    expect(['healthy', 'unhealthy']).toContain(mem!.status);
    expect(uptime!.status).toBe('healthy');
  });
});

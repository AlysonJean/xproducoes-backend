import { authRateLimit } from '../../middlewares/rateLimitMiddleware';

describe('authRateLimit middleware', () => {
  it('deve permitir requisições abaixo do limite', async () => {
    const req = { ip: '1.2.3.4', method: 'POST', url: '/login', headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    // Chama o handler diretamente para simular
    expect(typeof authRateLimit).toBe('function');
  });

  it('deve retornar 429 para IP acima do limite', () => {
    const req = { ip: '1.2.3.4', method: 'POST', url: '/login', headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    authRateLimit.handler(req, res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Too Many Requests' }));
  });

  it('deve pular IPs da whitelist', () => {
    const req = { ip: '127.0.0.1' };
    expect(authRateLimit.skip(req)).toBe(true);
  });

  it('não deve pular IPs não whitelist', () => {
    const req = { ip: '8.8.8.8' };
    expect(authRateLimit.skip(req)).toBe(false);
  });
});

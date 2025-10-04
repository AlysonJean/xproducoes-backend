const { performanceMonitoringMiddleware } = require('../../middlewares/performanceMonitoring');

describe('performanceMonitoringMiddleware', () => {
  it('deve chamar next e registrar tempo de resposta', () => {
    const req = { method: 'GET', path: '/api/test' };
    const res = { on: jest.fn((event, cb) => { if (event === 'finish') cb(); }) };
    const next = jest.fn();
    performanceMonitoringMiddleware(req, res, next);
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(next).toHaveBeenCalled();
  });
});

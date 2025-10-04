const { cacheMiddleware } = require('../../middlewares/cacheMiddleware');

describe('cacheMiddleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { originalUrl: '/api/test' };
    res = { json: jest.fn() };
    next = jest.fn();
  });

  it('deve chamar next e interceptar res.json', () => {
    cacheMiddleware(req, res, next);
    expect(typeof res.json).toBe('function');
    expect(next).toHaveBeenCalled();
  });

  it('deve armazenar resposta no cache e retornar do cache', () => {
    // Primeira chamada: armazena no cache
    cacheMiddleware(req, res, next);
    res.json({ foo: 'bar' });
    expect(res.json).toHaveBeenCalledWith({ foo: 'bar' });

    // Mock para simular chamada subsequente
    const res2 = { json: jest.fn() };
    const next2 = jest.fn();
    cacheMiddleware(req, res2, next2);
    // Deve retornar do cache
    expect(res2.json).toHaveBeenCalledWith({ foo: 'bar' });
    expect(next2).not.toHaveBeenCalled();
  });

  it('deve ignorar se res.json não existir', () => {
    const resNoJson = {};
    cacheMiddleware(req, resNoJson, next);
    expect(next).toHaveBeenCalled();
  });
});

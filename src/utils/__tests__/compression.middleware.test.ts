
import { compressionMiddleware, cacheHeadersMiddleware } from '../../middlewares/compressionMiddleware';
import { Request, Response, NextFunction } from 'express';

describe('compressionMiddleware', () => {
  it('deve ser uma função', () => {
    expect(typeof compressionMiddleware).toBe('function');
  });
});

describe('cacheHeadersMiddleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { method: 'GET', path: '/static/test.js', headers: {} };
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  it('deve definir cache headers para assets estáticos', () => {
    cacheHeadersMiddleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public'));
    expect(res.setHeader).toHaveBeenCalledWith('Expires', expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it('deve definir cache headers para endpoints de API', () => {
    const reqApi = { ...req, path: '/api/test' };
    cacheHeadersMiddleware(reqApi, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('private'));
    expect(res.setHeader).toHaveBeenCalledWith('ETag', expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it('não deve definir headers para outros métodos', () => {
    req.method = 'POST';
    cacheHeadersMiddleware(req, res, next);
    expect(res.setHeader).not.toHaveBeenCalledWith('Cache-Control', expect.anything());
    expect(next).toHaveBeenCalled();
  });
});

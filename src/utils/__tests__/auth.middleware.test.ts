import { authenticate, requireRole } from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

describe('auth middleware', () => {
  const next = jest.fn();
  let req, res;

  beforeEach(() => {
    req = { headers: {}, userRole: undefined };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next.mockClear();
  });

  it('deve retornar 401 se não houver token', async () => {
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve retornar 401 se token for inválido', async () => {
    req.headers.authorization = 'Bearer tokeninvalido';
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve chamar next se token for válido', async () => {
    const jwt = require('jsonwebtoken');
    jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'u1', role: 'ADMIN' });
    req.headers.authorization = 'Bearer valido';
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    jwt.verify.mockRestore();
  });

  it('requireRole deve negar acesso se role não permitida', () => {
    req.userRole = 'CLIENT';
    const middleware = requireRole(['ADMIN']);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('requireRole deve permitir acesso se role permitida', () => {
    req.userRole = 'ADMIN';
    const middleware = requireRole(['ADMIN']);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

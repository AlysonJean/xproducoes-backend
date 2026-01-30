import authAdvanced from '../../middlewares/authAdvanced';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';

describe('authenticateToken', () => {
  let req: any, res: any, next: any;
  beforeEach(() => {
    req = { headers: {}, user: undefined };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('deve retornar 401 se não houver token', async () => {
    await authAdvanced.authenticateToken(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MISSING_TOKEN' }));
  });

  it('deve retornar 401 se token for inválido', async () => {
    req.headers.authorization = 'Bearer tokeninvalido';
    jest.spyOn(jwt, 'verify').mockImplementation(() => { throw new jwt.JsonWebTokenError('invalid'); });
    await authAdvanced.authenticateToken(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
    (jwt.verify as jest.Mock).mockRestore();
  });

  it('deve retornar 401 se usuário não existir', async () => {
    req.headers.authorization = 'Bearer valido';
    jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'u1', role: 'ADMIN' } as any);
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    await authAdvanced.authenticateToken(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'USER_INACTIVE' }));
    (prisma.user.findUnique as jest.Mock).mockRestore();
    (jwt.verify as jest.Mock).mockRestore();
  });

  it('deve chamar next se token e usuário forem válidos', async () => {
    req.headers.authorization = 'Bearer valido';
    jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'u1', role: 'ADMIN' } as any);
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u1', email: 'a@a.com', role: 'ADMIN', isActive: true } as any);
    await authAdvanced.authenticateToken(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    (prisma.user.findUnique as jest.Mock).mockRestore();
    (jwt.verify as jest.Mock).mockRestore();
  });
});


describe('authorize', () => {
  it('deve negar acesso se não autenticado', () => {
    const req = { user: undefined };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const middleware = authAdvanced.authorize('resource', 'action');
    middleware(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it('deve negar acesso se não tiver permissão', () => {
    const req = { user: { role: 'CLIENT' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const middleware = authAdvanced.authorize('resource', 'action');
    middleware(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('deve permitir acesso se for ADMIN', () => {
    const req = { user: { role: 'ADMIN' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const middleware = authAdvanced.authorize('resource', 'action');
    middleware(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('generateToken', () => {
  it('deve gerar um token jwt', () => {
    const token = authAdvanced.generateToken('u1', 'a@a.com', 'ADMIN');
    expect(typeof token).toBe('string');
  });
});

describe('hasMinimumRole', () => {
  it('deve validar hierarquia de roles', () => {
    expect(authAdvanced.hasMinimumRole('ADMIN', 'MANAGER')).toBe(true);
    expect(authAdvanced.hasMinimumRole('COLLABORATOR', 'MANAGER')).toBe(false);
  });
});

describe('rateLimitByUser', () => {
  it('deve limitar requisições por usuário', () => {
    const middleware = authAdvanced.rateLimitByUser(1, 1000);
    const req = { user: { id: 'u1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    // Segunda chamada deve bloquear
    const next2 = jest.fn();
    middleware(req as any, res as any, next2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }));
  });
});

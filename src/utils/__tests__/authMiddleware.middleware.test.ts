import {
  authMiddleware,
  adminOnly,
  collaboratorOnly,
  adminOrCollaborator,
  optionalAuth,
  setSessionCookie,
  defaultCookieOptions
} from '../../middlewares/authMiddleware';

import jwt from 'jsonwebtoken';

describe('authMiddleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = { headers: {}, ip: '127.0.0.1', get: jest.fn(), method: 'GET', path: '/api', connection: { remoteAddress: '127.0.0.1' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('deve retornar 401 se não houver authorization', () => {
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  it('deve retornar 401 se formato do token for inválido', () => {
    req.headers.authorization = 'TokenInvalido';
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  it('deve chamar next se token for válido', () => {
    req.headers.authorization = 'Bearer valido';
    jest.spyOn(jwt as any, 'verify').mockReturnValue({ userId: 'u1', role: 'ADMIN' });
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    (jwt.verify as jest.Mock).mockRestore();
  });

  it('deve retornar 401 se token expirado', () => {
    req.headers.authorization = 'Bearer expirado';
    const error = new jwt.TokenExpiredError('jwt expired', new Date());
    jest.spyOn(jwt as any, 'verify').mockImplementation(() => { throw error; });
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    (jwt.verify as jest.Mock).mockRestore();
  });
});

describe('adminOnly', () => {
  it('deve negar acesso se não for ADMIN', () => {
    const req = { userRole: 'CLIENT' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    adminOnly(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('deve permitir acesso se for ADMIN', () => {
    const req = { userRole: 'ADMIN' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    adminOnly(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('collaboratorOnly', () => {
  it('deve negar acesso se não for COLLABORATOR', () => {
    const req = { userRole: 'CLIENT' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    collaboratorOnly(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('deve permitir acesso se for COLLABORATOR', () => {
    const req = { userRole: 'COLLABORATOR' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    collaboratorOnly(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('adminOrCollaborator', () => {
  it('deve negar acesso se não for ADMIN nem COLLABORATOR', () => {
    const req = { userRole: 'CLIENT' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    adminOrCollaborator(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('deve permitir acesso se for ADMIN', () => {
    const req = { userRole: 'ADMIN' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    adminOrCollaborator(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });
  it('deve permitir acesso se for COLLABORATOR', () => {
    const req = { userRole: 'COLLABORATOR' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    adminOrCollaborator(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  it('deve seguir sem autenticação se não houver token', () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();
    optionalAuth(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });
  it('deve seguir sem autenticação se formato inválido', () => {
    const req = { headers: { authorization: 'TokenInvalido' } };
    const res = {};
    const next = jest.fn();
    optionalAuth(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });
  it('deve setar user se token válido', () => {
    const req: any = { headers: { authorization: 'Bearer valido' } };
    const res = {};
    const next = jest.fn();
    jest.spyOn(jwt as any, 'verify').mockReturnValue({ userId: 'u1', role: 'ADMIN' });
    optionalAuth(req, res as any, next);
    expect(req.userId).toBe('u1');
    expect(req.userRole).toBe('ADMIN');
    (jwt.verify as jest.Mock).mockRestore();
    expect(next).toHaveBeenCalled();
  });
});

describe('setSessionCookie', () => {
  it('deve setar cookie com opções seguras', () => {
    const res = { cookie: jest.fn() };
    setSessionCookie(res as any, 'token', 'abc123');
    expect(res.cookie).toHaveBeenCalledWith('token', 'abc123', expect.objectContaining(defaultCookieOptions));
  });
});

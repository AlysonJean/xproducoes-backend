const { enhancedAuthMiddleware, requireRole, requireAdmin, requireCollaboratorOrAdmin } = require('../../middlewares/enhancedAuth');
const jwt = require('jsonwebtoken');

describe('enhancedAuthMiddleware', () => {
  let req, res, next;
  beforeEach(() => {
    req = { headers: {}, method: 'GET', path: '/api', ip: '127.0.0.1' };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('deve retornar 401 se não houver authorization', () => {
    enhancedAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_AUTH_HEADER' }));
  });

  it('deve retornar 401 se formato do token for inválido', () => {
    req.headers.authorization = 'TokenInvalido';
    enhancedAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN_FORMAT' }));
  });

  it('deve retornar 401 se token expirado', () => {
    req.headers.authorization = 'Bearer expirado';
    jest.spyOn(jwt, 'verify').mockImplementation(() => ({ userId: 'u1', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 10 }));
    enhancedAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
    jwt.verify.mockRestore();
  });

  it('deve chamar next se token for válido', () => {
    req.headers.authorization = 'Bearer valido';
    jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'u1', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 1000 });
    enhancedAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    jwt.verify.mockRestore();
  });
});

describe('requireRole', () => {
  it('deve negar acesso se não autenticado', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireRole(['ADMIN'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it('deve negar acesso se role não permitida', () => {
    const req = { userRole: 'CLIENT' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireRole(['ADMIN'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('deve permitir acesso se role permitida', () => {
    const req = { userRole: 'ADMIN' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireRole(['ADMIN'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  it('deve permitir acesso apenas para ADMIN', () => {
    const req = { userRole: 'ADMIN' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
  it('deve negar acesso para não ADMIN', () => {
    const req = { userRole: 'CLIENT' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('requireCollaboratorOrAdmin', () => {
  it('deve permitir acesso para COLLABORATOR ou ADMIN', () => {
    const req = { userRole: 'COLLABORATOR' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireCollaboratorOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
  it('deve negar acesso para outros roles', () => {
    const req = { userRole: 'CLIENT' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireCollaboratorOrAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

const { requireRole, adminOnly } = require('../../middlewares/unifiedAuth');

describe('requireRole', () => {
  it('deve negar acesso se userRole não estiver entre os permitidos', () => {
    const req = { userRole: 'CLIENT' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireRole(['ADMIN', 'COLLABORATOR'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Acesso negado' }));
  });

  it('deve exigir autenticação quando userRole não existir', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireRole(['ADMIN'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve permitir acesso se userRole estiver entre os permitidos', () => {
    const req = { userRole: 'ADMIN' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireRole(['ADMIN', 'COLLABORATOR'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('adminOnly', () => {
  it('deve negar acesso se não for ADMIN', () => {
    const req = { userRole: 'CLIENT' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    adminOnly(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Acesso negado: Apenas administradores' }));
  });
  it('deve permitir acesso se for ADMIN', () => {
    const req = { userRole: 'ADMIN' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    adminOnly(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

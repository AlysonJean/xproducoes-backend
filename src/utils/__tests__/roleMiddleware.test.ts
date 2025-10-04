const { roleMiddleware, adminOnly } = require('../../middlewares/roleMiddleware');

describe('roleMiddleware', () => {
  it('deve negar acesso se userRole não estiver entre os permitidos', () => {
    const req = { userRole: 'CLIENT' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    roleMiddleware(['ADMIN', 'COLLABORATOR'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado' });
  });
  it('deve permitir acesso se userRole estiver entre os permitidos', () => {
    const req = { userRole: 'ADMIN' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    roleMiddleware(['ADMIN', 'COLLABORATOR'])(req, res, next);
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
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso restrito a administradores.' });
  });
  it('deve permitir acesso se for ADMIN', () => {
    const req = { userRole: 'ADMIN' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    adminOnly(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

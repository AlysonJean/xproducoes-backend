import { ZodError } from 'zod';
import { errorHandler } from '../../middlewares/errorHandler';
import { AppError, ValidationError, NotFoundError, ForbiddenError, UnauthorizedError, ConflictError } from '../../utils/errors';

describe('errorHandler middleware', () => {
  let req: any, res: any, next: any;
  beforeEach(() => {
    req = { path: '/rota', method: 'GET' };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('deve retornar 422 para erro Zod', () => {
    const zodErr = new ZodError([{ code: 'custom', path: [], message: 'Campo obrigatório' }]);
    errorHandler(zodErr, req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Erro de validação de dados' }));
  });

  it('deve retornar 404 para erro de não encontrado', () => {
    const err = new NotFoundError('Recurso não encontrado');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deve retornar 403 para erro de acesso negado', () => {
    const err = new ForbiddenError('Acesso negado ao recurso');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve retornar 401 para erro de credenciais', () => {
    const err = new UnauthorizedError('Credenciais inválidas');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve retornar 409 para erro de conflito', () => {
    const err = new ConflictError('Email já está em uso');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('deve retornar 400 para erro de validação', () => {
    const err = new AppError('Campo obrigatório', 400);
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar 422 para ValidationError customizado', () => {
    const err = new ValidationError('Payload inválido');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('deve retornar 500 para erro genérico', () => {
    const err = new Error('Erro inesperado');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('deve retornar 500 para erro não padrão', () => {
    errorHandler('erro string', req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
